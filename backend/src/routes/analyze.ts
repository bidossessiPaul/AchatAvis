import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { query as dbQuery } from '../config/database';
import { transporter, emailConfig } from '../config/email';

const router = Router();

// Crée la table analyze_leads si elle n'existe pas encore
import { analyzeLeadsReady } from '../services/analyzeLeadsTable';

// Alias pour les routes de ce fichier
const tableReady = analyzeLeadsReady;

// Mapping secteur → difficulté de base + keywords SEO
const SECTOR_CONFIG: Record<string, { difficulty: number; label: string; services: string[] }> = {
    plumber: {
        difficulty: 42,
        label: 'Plomberie',
        services: ['plomberie', 'plombier', 'dépannage plomberie', 'fuite', 'chaudière', 'ballon eau chaude', 'chauffe-eau', 'débouchage canalisation', 'salle de bain', 'rénovation', 'installation sanitaire', 'entretien chaudière'],
    },
    locksmith: {
        difficulty: 45,
        label: 'Serrurerie',
        services: ['serrurerie', 'serrurier', 'dépannage serrurerie', 'remplacement serrure', 'ouverture porte', 'blindage', 'cylindre', 'serrure multipoints', 'dépannage urgent'],
    },
    restaurant: {
        difficulty: 35,
        label: 'Restauration',
        services: ['restaurant', 'cuisine', 'menu', 'plats', 'carte', 'déjeuner', 'dîner', 'réservation', 'terrasse', 'service', 'chef', 'gastronomie'],
    },
    electrician: {
        difficulty: 38,
        label: 'Électricité',
        services: ['électricien', 'électricité', 'installation électrique', 'tableau électrique', 'dépannage électrique', 'mise aux normes', 'éclairage', 'prises', 'câblage'],
    },
    garage: {
        difficulty: 30,
        label: 'Garage / Auto',
        services: ['garage', 'réparation auto', 'mécanique', 'révision', 'vidange', 'freins', 'contrôle technique', 'carrosserie', 'pneus'],
    },
    beauty_salon: {
        difficulty: 22,
        label: 'Salon de beauté',
        services: ['salon de coiffure', 'coiffeur', 'coupe', 'coloration', 'brushing', 'esthétique', 'manucure', 'soin', 'beauté'],
    },
    driving_school: {
        difficulty: 28,
        label: 'Auto-école / Moto-école',
        services: ['auto-école', 'permis de conduire', 'permis moto', 'code de la route', 'conduite accompagnée', 'formation conduite', 'leçon de conduite', 'permis B', 'permis A', 'moniteur'],
    },
    hotel: {
        difficulty: 40,
        label: 'Hôtel / Hébergement',
        services: ['hôtel', 'chambre', 'séjour', 'nuit', 'réservation', 'accueil', 'service hôtelier', 'petit-déjeuner', 'confort'],
    },
    health: {
        difficulty: 18,
        label: 'Santé / Médecin',
        services: ['médecin', 'cabinet médical', 'consultation', 'soins', 'spécialiste', 'rendez-vous médical', 'cabinet', 'praticien'],
    },
    default: {
        difficulty: 25,
        label: 'Commerce / Service',
        services: ['service', 'prestation', 'professionnel', 'artisan', 'entreprise', 'spécialiste'],
    },
};

const SATISFACTION_KEYWORDS = ['très satisfait', 'ravi', 'excellent', 'impeccable', 'au top', 'je recommande', 'à recommander', 'parfait', 'bluffant', 'sérieux', 'professionnel', 'fiable', 'de confiance', 'qualité', 'soigné'];

function detectSector(types: string[]): string {
    if (types.includes('plumber')) return 'plumber';
    if (types.includes('locksmith')) return 'locksmith';
    if (types.some(t => ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bakery', 'bar'].includes(t))) return 'restaurant';
    if (types.includes('electrician')) return 'electrician';
    if (types.some(t => ['car_repair', 'car_dealer'].includes(t))) return 'garage';
    if (types.some(t => ['beauty_salon', 'hair_care', 'spa'].includes(t))) return 'beauty_salon';
    if (types.some(t => ['driving_school'].includes(t))) return 'driving_school';
    if (types.some(t => ['lodging', 'hotel'].includes(t))) return 'hotel';
    if (types.some(t => ['doctor', 'dentist', 'physiotherapist', 'hospital', 'health'].includes(t))) return 'health';
    return 'default';
}

// Estimation ancienneté depuis le volume d'avis (sans Outscraper)
function estimerAnciennete(reviewCount: number): number {
    if (reviewCount > 300) return 60;
    if (reviewCount > 150) return 48;
    if (reviewCount > 80)  return 36;
    if (reviewCount > 40)  return 24;
    if (reviewCount > 15)  return 12;
    if (reviewCount > 5)   return 6;
    return 3;
}

function scoreValidation(reviewCount: number, rating: number, anciennete: number, sectorDiff: number): number {
    let score = 75;
    if (reviewCount > 100) score += 8;
    else if (reviewCount > 50) score += 5;
    else if (reviewCount < 10) score -= 15;
    else if (reviewCount < 5)  score -= 25;

    if (anciennete > 36) score += 5;
    else if (anciennete < 6) score -= 10;

    // Note trop haute avec peu d'avis = signal suspect
    if (rating >= 4.8 && reviewCount < 20) score -= 10;

    score -= Math.floor(sectorDiff / 7);

    return Math.min(65, Math.max(45, Math.round(score)));
}

function scoreSEO(reviewCount: number, rating: number, hasWebsite: boolean, hasPhone: boolean, hasPhotos: boolean): number {
    let score = 45;
    if (reviewCount > 100) score += 25;
    else if (reviewCount > 50) score += 15;
    else if (reviewCount > 20) score += 8;
    else if (reviewCount > 5)  score += 3;

    if (rating >= 4.5) score += 10;
    else if (rating >= 4.0) score += 5;

    if (hasWebsite) score += 8;
    if (hasPhone)   score += 5;
    if (hasPhotos)  score += 5;

    return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreDifficulty(reviewCount: number, sectorDiff: number, anciennete: number): number {
    let score = sectorDiff;
    if (reviewCount < 5)       score += 22;
    else if (reviewCount < 10) score += 15;
    else if (reviewCount > 50) score -= 8;

    if (anciennete < 6)  score += 20;
    else if (anciennete > 36) score -= 5;

    return Math.min(100, Math.max(0, Math.round(score)));
}

function selectPlaybook(reviewCount: number, difficulty: number, anciennete: number): string {
    if (anciennete < 12 && reviewCount < 10 && difficulty > 35) return 'amorçage_hybride';
    if (anciennete < 12 && difficulty <= 35) return 'démarrage_doux';
    if (anciennete > 24 && reviewCount > 50) return 'maintien';
    return 'standard';
}

interface OutscraperReview {
    review_datetime_utc?: string;
    review_rating?: number;
}

interface OutscraperResult {
    reviews_data?: OutscraperReview[];
    site?: string;
}

interface SpikeAnalysis {
    hasSpike: boolean;
    anciennete: number;  // mois depuis le 1er avis
    spikeDescription: string;
    site?: string;       // site web extrait par Outscraper (fallback si Places API ne retourne pas websiteUri)
}

// Outscraper fallback : récupère les infos d'une fiche Maps via scraping (URL directe)
// Utilisé quand Places API ne trouve pas la fiche (service area business, consultant, etc.)
async function fetchViaOutscraper(mapsUrl: string, apiKey: string): Promise<Record<string, any> | null> {
    try {
        const endpoint = `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(mapsUrl)}&limit=1&async=false&language=fr`;
        const res = await fetch(endpoint, {
            headers: { 'X-API-KEY': apiKey },
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) return null;
        const data = await res.json() as { data?: Record<string, any>[][] };
        return data?.data?.[0]?.[0] || null;
    } catch {
        return null;
    }
}

// Appel Outscraper pour récupérer l'historique des avis
async function fetchReviewHistory(placeId: string, apiKey: string): Promise<SpikeAnalysis> {
    try {
        const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(placeId)}&limit=200&sort=newest&async=false`;
        const res = await fetch(url, {
            headers: { 'X-API-KEY': apiKey },
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return { hasSpike: false, anciennete: 0, spikeDescription: '' };

        const data = await res.json() as { data?: OutscraperResult[] };
        const result = data?.data?.[0];
        const reviews: OutscraperReview[] = result?.reviews_data || [];
        const site = result?.site || undefined;

        if (reviews.length === 0) return { hasSpike: false, anciennete: 0, spikeDescription: '', site };

        // Ancienneté réelle : date du premier avis (le plus ancien)
        const dates = reviews
            .map(r => r.review_datetime_utc ? new Date(r.review_datetime_utc).getTime() : 0)
            .filter(t => t > 0)
            .sort((a, b) => a - b);

        const anciennete = dates.length > 0
            ? Math.round((Date.now() - dates[0]) / (1000 * 60 * 60 * 24 * 30))
            : 0;

        // Détection de pic : >10 avis sur une fenêtre de 7 jours
        const byWeek: Record<string, number> = {};
        reviews.forEach(r => {
            if (!r.review_datetime_utc) return;
            const d = new Date(r.review_datetime_utc);
            // Clé semaine : YYYY-WW
            const week = `${d.getFullYear()}-${Math.floor(d.getDate() / 7)}`;
            byWeek[week] = (byWeek[week] || 0) + 1;
        });

        const maxWeek = Math.max(...Object.values(byWeek));
        const hasSpike = maxWeek >= 10;
        const spikeWeek = hasSpike ? Object.entries(byWeek).find(([, v]) => v === maxWeek)?.[0] : '';

        return {
            hasSpike,
            anciennete,
            spikeDescription: hasSpike ? `~${maxWeek} avis postés en une semaine (semaine ${spikeWeek})` : '',
            site,
        };
    } catch {
        return { hasSpike: false, anciennete: 0, spikeDescription: '' };
    }
}

// Places API (New) v1 — headers communs
function placesHeaders(apiKey: string, fieldMask: string) {
    return { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask, 'Content-Type': 'application/json' };
}

// Résout un short link share.google → extrait le nom de la fiche depuis la redirection
async function resolveShareGoogle(url: string): Promise<{ resolvedUrl: string; extractedName: string | null; isKnowledgeGraph: boolean }> {
    // Étape 1 : share.google/xxx → Google Search URL ou Maps URL
    const step1 = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const step1Url = step1.url;

    // Étape 2 : tenter une redirection manuelle (certains liens redirigent encore)
    const step2 = await fetch(step1Url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const finalUrl = step2.headers.get('location') || step1Url;

    // kgmid = Knowledge Graph ID → profil personne/entité, pas une fiche Business Google
    const isKnowledgeGraph = finalUrl.includes('kgmid=') || step1Url.includes('kgmid=');

    // Extraire le nom depuis le paramètre q= de l'URL finale
    let extractedName: string | null = null;
    try {
        const parsed = new URL(finalUrl);
        const q = parsed.searchParams.get('q');
        if (q) extractedName = q;
    } catch {
        // ignore
    }

    return { resolvedUrl: finalUrl, extractedName, isKnowledgeGraph };
}

// Résout un short link Google (maps.app.goo.gl, goo.gl) vers l'URL longue Maps
// facebookexternalhit force une redirection HTTP 302 classique (pas de JS redirect)
async function resolveShortUrl(url: string): Promise<string> {
    const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    });
    return res.url;
}

// Extrait le Place ID depuis tous les formats d'URL Google Maps connus
function extractPlaceId(url: string): string | null {
    // Format standard dans data : !1sChIJ...
    const m1 = url.match(/!1s(ChIJ[^!&%]+)/);
    if (m1) return decodeURIComponent(m1[1]);
    // Format ?q=place_id:ChIJ... ou &place_id=ChIJ...
    const m2 = url.match(/place_id[=:](ChIJ[^&%!]+)/);
    if (m2) return decodeURIComponent(m2[1]);
    // Format CID numérique
    const m3 = url.match(/[?&]cid=([0-9]+)/);
    if (m3) return m3[1];
    // Hex CID format !1s0x... — on ne peut pas l'utiliser directement, retourner null
    // (le fallback Text Search prendra le relais avec le nom extrait de l'URL)
    return null;
}

// Coords précises du business depuis !3d..!4d.. (inscrites dans les données Maps, pas la vue)
function extractPreciseCoords(url: string): { lat: number; lng: number } | null {
    const m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
}

// Coords de la vue carte depuis @lat,lng,Zz (fiables seulement si zoom élevé ≥ 14)
function extractViewCoords(url: string): { lat: number; lng: number } | null {
    const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(1[4-9]|20|21)z/);
    return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
}

function extractNameFromUrl(url: string): string | null {
    // Ne pas exclure + : il encode les espaces dans les noms de place
    const m = url.match(/\/place\/([^/@?]+)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).replace(/_/g, ' ').trim() : null;
}

// Nearby Search (Places API New) — trouve le business depuis des coordonnées précises
// Vérifie optionnellement le nom pour éviter les faux positifs dans les zones denses
// Tente des rayons croissants : 50m → 150m → 500m
async function searchPlaceByCoords(
    coords: { lat: number; lng: number },
    apiKey: string,
    expectedName?: string,
): Promise<string | null> {
    // Mots significatifs du nom attendu (>4 chars) pour vérification — dédupliqués
    const expectedWords = expectedName
        ? [...new Set(expectedName.toLowerCase().split(/\s+/).filter(w => w.length > 4))]
        : [];
    const required = Math.min(2, expectedWords.length);

    for (const radius of [50, 150, 500]) {
        const body = {
            locationRestriction: {
                circle: { center: { latitude: coords.lat, longitude: coords.lng }, radius },
            },
            maxResultCount: 10,
            languageCode: 'fr',
        };
        const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: placesHeaders(apiKey, 'places.id,places.displayName,places.types'),
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) continue;
        const data = await res.json() as { places?: { id: string; types?: string[]; displayName?: { text: string } }[] };
        const places = data.places || [];

        for (const place of places) {
            const t = place.types || [];
            // Doit être un établissement réel
            if (!t.includes('establishment') && !t.includes('point_of_interest')) continue;
            // Vérification du nom si on en a un
            if (expectedWords.length > 0) {
                const placeName = (place.displayName?.text || '').toLowerCase();
                const matched = expectedWords.filter(w => placeName.includes(w)).length;
                if (matched < required) continue;
            }
            return place.id;
        }
    }
    return null;
}

// Text Search (Places API New) — retourne le Place ID si le nom correspond au moins partiellement
async function searchPlaceByText(query: string, apiKey: string, coords?: { lat: number; lng: number }): Promise<string | null> {
    const body: Record<string, unknown> = { textQuery: query, languageCode: 'fr', maxResultCount: 3 };
    if (coords) {
        body.locationBias = { circle: { center: { latitude: coords.lat, longitude: coords.lng }, radius: 2000 } };
    }
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: placesHeaders(apiKey, 'places.id,places.displayName'),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { places?: { id: string; displayName?: { text: string } }[] };
    if (!data.places?.length) return null;

    // Anti-faux-positif : au moins min(2, N) mots significatifs (>4 chars) de la query doivent matcher le nom
    // Dédupliqués pour éviter qu'un mot répété deux fois dans le nom compte double (ex: "Brest ... Brest")
    const queryWords = [...new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 4))];
    if (queryWords.length === 0) return data.places[0].id;
    const required = Math.min(2, queryWords.length);
    for (const place of data.places) {
        const name = (place.displayName?.text || '').toLowerCase();
        const matched = queryWords.filter(w => name.includes(w)).length;
        if (matched >= required) return place.id;
    }
    return null;
}

// Place Details (Places API New v1)
async function fetchPlaceDetails(placeId: string, apiKey: string) {
    const mask = 'displayName,rating,userRatingCount,formattedAddress,types,websiteUri,nationalPhoneNumber,photos';
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`, {
        headers: placesHeaders(apiKey, mask),
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, any>>;
}

// Génère les listes Vigilance / Atouts depuis les données brutes (sans IA)
function buildDiagnostic(params: {
    reviewCount: number; rating: number; anciennete: number;
    hasWebsite: boolean; hasPhone: boolean; hasPhotos: boolean;
    hasSpike: boolean; spikeDescription: string; flags: string[];
    scores: { validation: number; seo: number; difficulty: number };
}) {
    const warnings: string[] = [];
    const strengths: string[] = [];
    const { reviewCount, rating, anciennete, hasWebsite, hasPhone, hasPhotos, hasSpike, spikeDescription, flags, scores } = params;

    if (hasSpike && spikeDescription) warnings.push(spikeDescription);
    if (flags.includes('note_suspecte')) warnings.push('Note ≥ 4,8 avec peu d\'avis — profil atypique');
    if (flags.includes('fiche_jeune')) warnings.push(`Fiche récente (${anciennete} mois) — encore en rodage`);
    if (flags.includes('secteur_surveille')) warnings.push('Secteur sous surveillance Google Maps');
    if (!hasWebsite) warnings.push('Aucun site web référencé sur la fiche');
    if (!hasPhone) warnings.push('Numéro de téléphone manquant');
    if (!hasPhotos) warnings.push('Aucune photo — profil incomplet');
    if (scores.seo < 55) warnings.push('Score SEO local faible — mots-clés sous-exploités');
    if (reviewCount < 10) warnings.push('Volume d\'avis insuffisant pour le SEO local');
    if (warnings.length === 0) warnings.push('Aucun signal négatif détecté');

    if (reviewCount > 100) strengths.push(`Volume mature : ${reviewCount} avis Google`);
    else if (reviewCount > 30) strengths.push(`${reviewCount} avis — base solide`);
    else if (reviewCount > 0) strengths.push(`${reviewCount} avis présents`);
    if (rating >= 4.5) strengths.push(`Note ${rating.toFixed(1).replace('.', ',')}★ — excellente réputation`);
    else if (rating >= 4.0) strengths.push(`Note ${rating.toFixed(1).replace('.', ',')}★ — bonne réputation`);
    if (anciennete > 36) strengths.push(`Fiche établie depuis ${Math.round(anciennete / 12)} an(s) — historique solide`);
    else if (anciennete > 12) strengths.push(`Présence Google depuis ${Math.round(anciennete / 12)} an(s)`);
    if (hasWebsite) strengths.push('Site web référencé sur la fiche');
    if (hasPhone) strengths.push('Téléphone visible — accès direct clients');
    if (hasPhotos) strengths.push('Photos présentes — profil visuel complet');
    if (scores.seo >= 80) strengths.push('Score SEO local élevé');
    if (strengths.length === 0) strengths.push('Fiche créée — potentiel à développer');

    return { warnings, strengths };
}

// Génère via Claude : formulations OK/interdites + 4 exemples d'avis style opinion
async function generateAIContent(params: {
    name: string; categoryLabel: string; ville: string;
    services: string[]; satisfaction: string[];
    reviewCount: number; rating: number;
}, anthropicKey: string): Promise<{ ok: string[]; ko: string[]; examples: { type: string; text: string }[] } | null> {
    try {
        const client = new Anthropic({ apiKey: anthropicKey });
        const top5 = params.services.slice(0, 5).join(', ');
        const top3sat = params.satisfaction.slice(0, 3).join(', ');
        const v = params.ville || 'France';

        const prompt = `Tu génères du contenu pour une plateforme d'avis Google pour la fiche :
"${params.name}" (${params.categoryLabel}) — ${v}
Avis actuels : ${params.reviewCount} avis · Note : ${params.rating}★
Mots-clés services : ${top5}
Mots-clés satisfaction : ${top3sat}

Génère en JSON STRICT (pas de markdown, pas de commentaires) :
{
  "ok": [
    5 phrases d'opinion AUTORISÉE. L'auteur observe depuis l'extérieur (site, fiche, réputation, téléphone) SANS prétendre avoir reçu le service. Débuts variés : "En cherchant un(e)...", "J'ai remarqué que...", "La réputation de...", "Bonne impression au...", "Je suis tombé sur...". Intègre les mots-clés services ET satisfaction naturellement. Court à moyen (1-2 phrases max).
  ],
  "ko": [
    5 phrases INTERDITES car elles inventent une expérience client (intervention reçue, réparation, date, montant, adresse). Variées : "J'ai fait appel à...", "Ils sont intervenus...", "La réparation...", "Le technicien...", "Tarif facturé...".
  ],
  "examples": [
    { "type": "pro", "text": "avis 2-3 phrases style opinion PRO basé sur image/réputation de ${params.name}, intègre ${top5.split(',')[0]} et ${top3sat.split(',')[0]}" },
    { "type": "tel", "text": "avis 2 phrases style opinion TÉLÉPHONE pour ${params.name} à ${v}" },
    { "type": "online", "text": "avis 2 phrases style opinion EN LIGNE (site web/réseaux) pour ${params.name}" },
    { "type": "reco", "text": "avis 2 phrases style RECOMMANDATION pour ${params.name}" }
  ]
}`;

        const message = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1200,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = (message.content[0] as any)?.text || '';
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) return null;
        return JSON.parse(m[0]);
    } catch {
        return null;
    }
}

// Route publique — aucune auth requise
router.post('/', async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL requise' });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Clé Google Places non configurée côté serveur' });
    }

    try {
        // 1. Normaliser et résoudre l'URL
        let longUrl = url.trim();
        let shareGoogleName: string | null = null;

        // Résoudre les short links (maps.app.goo.gl, goo.gl)
        if (/goo\.gl|maps\.app\.goo\.gl/.test(longUrl)) {
            longUrl = await resolveShortUrl(longUrl);
        }

        // 2. Extraire le Place ID (ChIJ ou CID numérique)
        let placeId = extractPlaceId(longUrl);

        // 3a. URLs Google Maps sans Place ID → multi-stratégie
        if (!placeId && longUrl.includes('google.com/maps')) {
            const preciseCoords = extractPreciseCoords(longUrl);
            const viewCoords    = extractViewCoords(longUrl);
            const name          = extractNameFromUrl(longUrl);

            // Si on a extrait un nom depuis l'URL, l'utiliser pour les messages d'erreur
            if (name && !shareGoogleName) shareGoogleName = name;

            // Stratégie A : Nearby Search sur coordonnées précises (!3d!4d) avec vérification nom
            if (preciseCoords) {
                placeId = await searchPlaceByCoords(preciseCoords, apiKey, name || undefined);
            }

            // Stratégie B : Text Search avec nom + coords si Nearby n'a rien trouvé
            if (!placeId && name) {
                const coords = preciseCoords || viewCoords;
                if (coords) placeId = await searchPlaceByText(name, apiKey, coords);
            }

            // Stratégie C : Text Search global sans coords (dernier recours)
            if (!placeId && name) {
                placeId = await searchPlaceByText(name, apiKey);
            }
        }

        // 3b. URLs Google Search → extraire q= et Text Search
        if (!placeId && longUrl.includes('google.com/search')) {
            try {
                const parsed = new URL(longUrl);
                const kgmid = parsed.searchParams.get('kgmid');
                const q = parsed.searchParams.get('q');
                if (q) {
                    shareGoogleName = q;
                    placeId = await searchPlaceByText(q, apiKey);
                }
                // Seulement si kgmid ET aucun résultat Places → c'est un profil perso
                if (!placeId && kgmid) {
                    return res.status(422).json({ error: 'Ce lien pointe vers une entité sans fiche Google Business associée. Demandez à votre client le lien depuis Google Maps → Partager.' });
                }
            } catch { /* ignore */ }
        }

        // 3c. share.google → résoudre la redirection et traiter l'URL finale
        if (!placeId && longUrl.includes('share.google')) {
            const { resolvedUrl, extractedName } = await resolveShareGoogle(longUrl);
            shareGoogleName = extractedName;

            // Si share.google redirige vers une URL Maps directe → utiliser cette URL comme longUrl
            if (resolvedUrl && (resolvedUrl.includes('google.com/maps') || resolvedUrl.includes('maps.google'))) {
                longUrl = resolvedUrl; // Outscraper fallback bénéficiera de l'URL Maps
                placeId = extractPlaceId(resolvedUrl);
                if (!placeId) {
                    const resolvedCoords = extractPreciseCoords(resolvedUrl) || extractViewCoords(resolvedUrl);
                    const resolvedName   = extractNameFromUrl(resolvedUrl) || extractedName;
                    if (resolvedName && resolvedCoords) placeId = await searchPlaceByText(resolvedName, apiKey, resolvedCoords);
                    if (!placeId && resolvedName)       placeId = await searchPlaceByText(resolvedName, apiKey);
                }
            }

            // Sinon (Google Search / kgmid) → Text Search avec le nom extrait
            if (!placeId && extractedName) {
                placeId = await searchPlaceByText(extractedName, apiKey);
                // Mettre à jour longUrl avec le nom pour qu'Outscraper puisse chercher par nom
                if (!placeId) longUrl = extractedName;
            }

            // Seulement si kgmid ET aucun résultat Places → on laisse Outscraper tenter avant d'abandonner
            // (ne pas retourner 422 ici — Outscraper peut récupérer la fiche via le nom)
        }

        const outscraper_key = process.env.OUTSCRAPER_API_KEY;
        const anthropic_key  = process.env.ANTHROPIC_API_KEY;

        // Fallback Outscraper si Places API n'a pas trouvé la fiche
        // (service area business, consultant indépendant, fiche sans adresse fixe, etc.)
        if (!placeId && outscraper_key) {
            const raw = await fetchViaOutscraper(longUrl, outscraper_key);
            if (raw && raw.name) {
                // Construire la réponse directement depuis les données Outscraper
                const reviewCount: number = raw.reviews || 0;
                const rating: number      = raw.rating || 0;
                const types: string[]     = raw.type ? [raw.type.toLowerCase().replace(/\s+/g, '_')] : [];
                const hasWebsite          = !!raw.site;
                const hasPhone            = !!raw.phone;
                const hasPhotos           = (raw.photos_count || 0) > 0;
                const sector     = detectSector(types);
                const cfg        = SECTOR_CONFIG[sector] || SECTOR_CONFIG['default'];
                const anciennete = estimerAnciennete(reviewCount);
                const validation = scoreValidation(reviewCount, rating, anciennete, cfg.difficulty);
                const seo        = scoreSEO(reviewCount, rating, hasWebsite, hasPhone, hasPhotos);
                const difficulty = scoreDifficulty(reviewCount, cfg.difficulty, anciennete);
                const verdict    = difficulty < 30 ? 'Facile' : difficulty < 55 ? 'Modéré' : difficulty < 75 ? 'Difficile' : 'Expert';
                const flags: string[] = [];
                if (rating >= 4.8 && reviewCount < 20) flags.push('note_suspecte');
                if (anciennete < 12) flags.push('fiche_jeune');
                const addrParts  = (raw.full_address || '').split(',');
                const ville      = addrParts.length > 1 ? addrParts[addrParts.length - 2]?.trim() : '';
                const geoKeywords = [ville, `secteur ${ville}`, `proche ${ville}`, 'à proximité', 'localement'].filter(Boolean);
                const scores     = { validation, seo, difficulty };
                const diagParams = { reviewCount, rating, anciennete, hasWebsite, hasPhone, hasPhotos, hasSpike: false, spikeDescription: '', flags, scores };
                const aiParams   = { name: raw.name, categoryLabel: raw.type || cfg.label, ville, services: cfg.services, satisfaction: SATISFACTION_KEYWORDS, reviewCount, rating };
                const diagnostic = buildDiagnostic(diagParams);
                const aiContent  = anthropic_key ? await generateAIContent(aiParams, anthropic_key) : null;
                // Outscraper renvoie main_image comme photo principale de la fiche
                const photoUrl: string | null = raw.main_image || raw.logo || null;
                return res.json({
                    name:            raw.name,
                    categoryLabel:   raw.type || cfg.label,
                    types,
                    rating,
                    reviewCount,
                    address:         raw.full_address || '',
                    ville,
                    hasWebsite,
                    hasPhone,
                    hasPhotos,
                    anciennete,
                    ancienneteLabel: anciennete < 12 ? `${anciennete} mois (estimé)` : `${Math.round(anciennete / 12)} an(s) (estimé)`,
                    hasSpike:        false,
                    spikeDescription: '',
                    scores,
                    verdict,
                    flags,
                    playbook:        selectPlaybook(reviewCount, difficulty, anciennete),
                    keywords: { services: cfg.services, geo: geoKeywords, satisfaction: SATISFACTION_KEYWORDS },
                    diagnostic,
                    formulations:    aiContent ? { ok: aiContent.ok, ko: aiContent.ko } : null,
                    aiExamples:      aiContent?.examples || null,
                    photoUrl,
                });
            }
        }

        if (!placeId) {
            return res.status(422).json({ error: 'Impossible de retrouver cette fiche Google Maps. Vérifiez que le lien pointe bien vers un établissement ou une fiche professionnelle.' });
        }

        // 5. Appels en parallèle : Places API (New) v1 + Outscraper
        const [place, spikeData] = await Promise.all([
            fetchPlaceDetails(placeId, apiKey),
            outscraper_key ? fetchReviewHistory(placeId, outscraper_key) : Promise.resolve<SpikeAnalysis>({ hasSpike: false, anciennete: 0, spikeDescription: '' }),
        ]);

        if (!place) {
            return res.status(422).json({ error: 'Fiche introuvable sur Google Maps. Vérifiez le lien.' });
        }

        // Mapping champs Places API (New) → anciens noms
        const reviewCount: number = place.userRatingCount || 0;
        const rating: number      = place.rating || 0;
        const types: string[]     = place.types || [];
        const hasWebsite          = !!place.websiteUri || !!spikeData.site;
        const hasPhone            = !!place.nationalPhoneNumber;
        const hasPhotos           = (place.photos || []).length > 0;

        // 5. Secteur + scores
        const sector     = detectSector(types);
        const cfg        = SECTOR_CONFIG[sector] || SECTOR_CONFIG['default'];
        // Ancienneté : réelle si Outscraper a répondu, estimée sinon
        const ancienneteReelle = spikeData.anciennete > 0;
        const anciennete = ancienneteReelle ? spikeData.anciennete : estimerAnciennete(reviewCount);
        const hasSpike   = spikeData.hasSpike;

        const validation = scoreValidation(reviewCount, rating, anciennete, cfg.difficulty);
        const seo        = scoreSEO(reviewCount, rating, hasWebsite, hasPhone, hasPhotos);
        const difficulty = scoreDifficulty(reviewCount, cfg.difficulty, anciennete);

        // 6. Verdict + flags
        const verdict = difficulty < 30 ? 'Facile' : difficulty < 55 ? 'Modéré' : difficulty < 75 ? 'Difficile' : 'Expert';
        const flags: string[] = [];
        if (rating >= 4.8 && reviewCount < 20) flags.push('note_suspecte');
        if (anciennete < 12)  flags.push('fiche_jeune');
        if (hasSpike)         flags.push('pic_detecte');
        if (difficulty > 60)  flags.push('secteur_surveille');

        // 7. Keywords géo depuis l'adresse
        const addrParts  = (place.formattedAddress || '').split(',');
        const ville       = addrParts.length > 1 ? addrParts[addrParts.length - 2]?.trim() : '';
        const geoKeywords = [ville, `secteur ${ville}`, `proche ${ville}`, `à proximité`, 'localement'].filter(Boolean);

        // 8. Photo principale depuis Places API (New) v1 — construit l'URL directement
        const firstPhoto = (place.photos as { name: string }[] | undefined)?.[0];
        const photoUrl: string | null = firstPhoto?.name
            ? `https://places.googleapis.com/v1/${firstPhoto.name}/media?key=${apiKey}&maxWidthPx=400`
            : null;

        // 9. Diagnostic + contenu IA
        const diagParams = { reviewCount, rating, anciennete, hasWebsite, hasPhone, hasPhotos, hasSpike, spikeDescription: spikeData.spikeDescription, flags, scores: { validation, seo, difficulty } };
        const aiParams   = { name: place.displayName?.text || 'Établissement', categoryLabel: cfg.label, ville, services: cfg.services, satisfaction: SATISFACTION_KEYWORDS, reviewCount, rating };

        const diagnostic = buildDiagnostic(diagParams);
        const aiContent  = anthropic_key ? await generateAIContent(aiParams, anthropic_key) : null;

        const responsePayload = {
            name:           place.displayName?.text || 'Établissement',
            categoryLabel:  cfg.label,
            types,
            rating,
            reviewCount,
            address:        place.formattedAddress,
            ville,
            hasWebsite,
            hasPhone,
            hasPhotos,
            anciennete,
            ancienneteLabel: anciennete < 12
                ? `${anciennete} mois${ancienneteReelle ? '' : ' (estimé)'}`
                : `${Math.round(anciennete / 12)} an(s)${ancienneteReelle ? '' : ' (estimé)'}`,
            hasSpike,
            spikeDescription: spikeData.spikeDescription,
            scores:         { validation, seo, difficulty },
            verdict,
            flags,
            playbook:       selectPlaybook(reviewCount, difficulty, anciennete),
            keywords: {
                services:     cfg.services,
                geo:          geoKeywords,
                satisfaction: SATISFACTION_KEYWORDS,
            },
            diagnostic,
            formulations:   aiContent ? { ok: aiContent.ok, ko: aiContent.ko } : null,
            aiExamples:     aiContent?.examples || null,
            photoUrl,
        };

        // Sauvegarde du lead en base (fire-and-forget — n'impacte pas la réponse)
        const leadId = uuidv4();
        const originalUrl = (url as string) || '';
        ;(async () => {
            try {
                await tableReady; // attend que la table existe avant d'insérer
                await dbQuery(
                    `INSERT INTO analyze_leads
                     (id, business_name, address, original_url, rating, review_count, category_label, verdict,
                      scores_validation, scores_seo, scores_difficulty, has_website, has_spike, ip_address, report_data)
                     VALUES (:id, :bn, :addr, :ou, :rating, :rc, :cat, :verdict, :sv, :ss, :sd, :hw, :hs, :ip, :rd)`,
                    {
                        id:      leadId,
                        bn:      responsePayload.name,
                        addr:    responsePayload.address || '',
                        ou:      originalUrl,
                        rating:  responsePayload.rating,
                        rc:      responsePayload.reviewCount,
                        cat:     responsePayload.categoryLabel,
                        verdict: responsePayload.verdict,
                        sv:      responsePayload.scores.validation,
                        ss:      responsePayload.scores.seo,
                        sd:      responsePayload.scores.difficulty,
                        hw:      responsePayload.hasWebsite ? 1 : 0,
                        hs:      responsePayload.hasSpike ? 1 : 0,
                        ip:      (req as any).ip || '',
                        rd:      JSON.stringify(responsePayload),
                    }
                );
            } catch (e: any) {
                console.error('[analyze_leads INSERT]', e?.message);
            }
        })();

        return res.json({ ...responsePayload, _lead_id: leadId, _original_url: originalUrl });

    } catch (err: any) {
        console.error('[POST /api/analyze]', err.message);
        return res.status(500).json({ error: 'Erreur interne lors de l\'analyse' });
    }
});

// Capture les coordonnées du lead + envoie le rapport par email
router.post('/capture', async (req: Request, res: Response) => {
    const { lead_id, name, email, phone, action, business_name, report_url } = req.body as {
        lead_id?: string; name?: string; email?: string; phone?: string;
        action?: string; business_name?: string; report_url?: string;
    };

    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Nom, email et téléphone requis' });
    }
    if (!lead_id) {
        return res.status(400).json({ error: 'lead_id manquant' });
    }

    try {
        // Sauvegarde des coordonnées en DB
        await dbQuery(
            `UPDATE analyze_leads SET contact_name=:n, contact_email=:e, contact_phone=:p, contact_at=NOW()
             WHERE id=:id`,
            { n: name, e: email, p: phone, id: lead_id }
        );

        // Email au client
        const shareUrl = report_url || '';
        const biz = business_name || 'votre fiche Google';
        await transporter.sendMail({
            from: emailConfig.from,
            to: email,
            subject: `Votre analyse Google Business — ${biz}`,
            html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
              <div style="background:linear-gradient(135deg,#059669,#047857);padding:32px 28px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em;">AchatAvis</div>
                <div style="color:#a7f3d0;font-size:14px;margin-top:4px;">Votre rapport d'analyse Google Business</div>
              </div>
              <div style="padding:32px 28px;">
                <p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 8px;">Bonjour ${name},</p>
                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Votre analyse de la fiche <strong style="color:#0f172a;">${biz}</strong> est prête.
                  Cliquez ci-dessous pour consulter votre rapport complet avec les recommandations avancées
                  pour <strong>optimiser votre fiche</strong> et <strong>dépasser vos concurrents</strong>.
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <a href="${shareUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                    Voir mon rapport complet →
                  </a>
                </div>
                <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;margin-top:20px;">
                  <p style="color:#64748b;font-size:13px;margin:0;">Le lien ci-dessus vous est réservé. Vous pouvez le partager à qui vous souhaitez pour qu'ils voient votre analyse.</p>
                </div>
              </div>
              <div style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="color:#94a3b8;font-size:12px;margin:0;">© AchatAvis · <a href="https://achatavis.com" style="color:#059669;">achatavis.com</a></p>
              </div>
            </div>`,
        });

        // Notification interne admin
        transporter.sendMail({
            from: emailConfig.from,
            to: process.env.ADMIN_EMAIL || 'contact@achatavis.com',
            subject: `[Lead Analyseur] ${name} — ${biz}`,
            html: `<p><b>Nom :</b> ${name}<br><b>Email :</b> ${email}<br><b>Téléphone :</b> ${phone}<br><b>Fiche :</b> ${biz}<br><b>Action :</b> ${action || '?'}<br><b>Rapport :</b> <a href="${shareUrl}">${shareUrl}</a></p>`,
        }).catch(() => {});

        return res.json({ ok: true });
    } catch (err: any) {
        console.error('[capture]', err.message);
        return res.status(500).json({ error: 'Erreur lors de l\'envoi' });
    }
});

// Récupère un rapport sauvegardé par ID (public, pas d'auth — lien partageable)
router.get('/report/:id', async (req: Request, res: Response) => {
    try {
        const rows = await dbQuery(
            'SELECT report_data, original_url FROM analyze_leads WHERE id = :id LIMIT 1',
            { id: req.params.id }
        );
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Rapport introuvable' });
        }
        const data = typeof rows[0].report_data === 'string'
            ? JSON.parse(rows[0].report_data)
            : rows[0].report_data;
        // Inclure l'URL originale pour pré-remplir le champ dans le viewer
        data._original_url = rows[0].original_url || '';
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
