import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service centralisé pour gestion des établissements
 */
class EstablishmentService {

    /**
     * MÉTHODE 1 : Rechercher et créer depuis Google Places
     */
    async createFromGoogleSearch(
        userId: string,
        searchQuery: string,
        city: string
    ): Promise<any> {
        try {
            console.log(`🔍 Recherche Google Places : "${searchQuery}" à ${city}`);

            // 1. Rechercher sur Google Places
            const searchResults = await this.searchGooglePlaces(`${searchQuery} ${city}`);

            if (!searchResults || searchResults.length === 0) {
                throw new Error('Aucun établissement trouvé sur Google Maps');
            }

            // Prendre le premier résultat (le plus pertinent)
            const placeData = searchResults[0];

            // 2. Récupérer détails complets
            const placeDetails = await this.getGooglePlaceDetails(placeData.place_id);

            // 3. Vérifier si déjà existe (par place_id)
            const existing = await this.findByGooglePlaceId(placeData.place_id);
            if (existing) {
                throw new Error('Cet établissement existe déjà dans la base de données');
            }

            // 4. Extraire et formater les données
            const establishmentData = this.extractDataFromGooglePlace(placeDetails);

            // 5. Générer slug unique
            const slug = await this.generateUniqueSlug(establishmentData.name, establishmentData.city);

            const establishmentId = uuidv4();

            // 6. Créer en base
            await query(
                `INSERT INTO establishments (
                    id, user_id, name, slug, address_line1, city, postal_code, region, 
                    country, country_code, phone, website, latitude, longitude, 
                    geocoded, source_type, google_place_id, google_data, verification_status, platform_links
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    establishmentId,
                    userId,
                    establishmentData.name,
                    slug,
                    establishmentData.address_line1 || '',
                    establishmentData.city,
                    establishmentData.postal_code || '',
                    establishmentData.region || '',
                    'France',
                    'FR',
                    establishmentData.phone || '',
                    establishmentData.website || '',
                    establishmentData.latitude,
                    establishmentData.longitude,
                    true,
                    'google_search',
                    placeData.place_id,
                    JSON.stringify(placeDetails),
                    'pending',
                    JSON.stringify({
                        google: {
                            url: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeData.place_id}`,
                            place_id: placeData.place_id,
                            verified: true,
                            last_checked: new Date().toISOString()
                        }
                    })
                ]
            );

            console.log(`✅ Établissement créé depuis Google : ID ${establishmentId}`);

            return {
                establishment_id: establishmentId,
                data: establishmentData,
                needs_validation: true
            };

        } catch (error: any) {
            console.error('❌ Erreur recherche Google:', error);
            throw error;
        }
    }

    /**
     * MÉTHODE 2 : Créer depuis lien Google Maps direct
     */
    async createFromGoogleLink(
        userId: string,
        googleMapsUrl: string
    ): Promise<any> {
        try {
            console.log(`🔗 Extraction depuis lien : ${googleMapsUrl}`);

            // 1. Extraire place_id du lien
            let placeId = await this.extractPlaceIdFromUrl(googleMapsUrl);
            if (!placeId) {
                throw new Error('Impossible d\'extraire le place_id du lien fourni. Assurez-vous qu\'il s\'agit d\'un lien Google Maps valide (Partager -> Copier le lien).');
            }

            // Fallback: If we only got a search query or KG ID, perform a search to get the real place_id
            if (placeId.startsWith('SEARCH:')) {
                console.log('🔄 Fallback: Recherche de l\'établissement via identifiant extrait...');
                const queryStr = placeId.replace('SEARCH:', '');
                const results = await this.searchGooglePlaces(queryStr);

                if (results && results.length > 0 && results[0].place_id) {
                    placeId = results[0].place_id;
                    console.log('✅ Place ID trouvé via recherche fallback:', placeId);
                } else {
                    throw new Error('Lien reconnu mais établissement introuvable sur Google Maps (via recherche interne).');
                }
            }

            // 2. Vérifier si déjà existe
            const existing = await this.findByGooglePlaceId(placeId!);
            if (existing) {
                throw new Error('Cet établissement existe déjà dans la base de données');
            }

            // 3. Récupérer détails depuis Google Places API
            const placeDetails = await this.getGooglePlaceDetails(placeId!);

            // 4. Extraire et formater
            const establishmentData = this.extractDataFromGooglePlace(placeDetails);

            // 5. Générer slug
            const slug = await this.generateUniqueSlug(establishmentData.name, establishmentData.city);

            const establishmentId = uuidv4();

            // 6. Créer en base
            await query(
                `INSERT INTO establishments (
                    id, user_id, name, slug, address_line1, city, postal_code, region, 
                    country, country_code, phone, website, latitude, longitude, 
                    geocoded, source_type, google_place_id, google_data, verification_status, platform_links
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    establishmentId,
                    userId,
                    establishmentData.name,
                    slug,
                    establishmentData.address_line1 || '',
                    establishmentData.city,
                    establishmentData.postal_code || '',
                    establishmentData.region || '',
                    'France',
                    'FR',
                    establishmentData.phone || '',
                    establishmentData.website || '',
                    establishmentData.latitude,
                    establishmentData.longitude,
                    true,
                    'google_link',
                    placeId,
                    JSON.stringify(placeDetails),
                    'pending',
                    JSON.stringify({
                        google: {
                            url: googleMapsUrl,
                            place_id: placeId,
                            verified: true,
                            last_checked: new Date().toISOString()
                        }
                    })
                ]
            );

            console.log(`✅ Établissement créé depuis lien : ID ${establishmentId}`);

            return {
                establishment_id: establishmentId,
                data: establishmentData,
                needs_validation: true
            };

        } catch (error: any) {
            console.error('❌ Erreur extraction lien:', error);
            throw error;
        }
    }

    /**
     * MÉTHODE 3 : Créer manuellement (sans Google)
     */
    async createManually(
        userId: string,
        manualData: any
    ): Promise<any> {
        try {
            console.log(`✍️ Création manuelle : ${manualData.name}`);

            // 1. Validation des données obligatoires
            this.validateManualData(manualData);

            // 2. Vérifier doublons potentiels (par nom + ville)
            const duplicates: any = await this.findPotentialDuplicates(
                manualData.name,
                manualData.city
            );

            const warnings: string[] = [];
            if (duplicates.length > 0) {
                warnings.push(`${duplicates.length} doublon(s) potentiel(s) détecté(s).`);
            }

            // 3. Géocoder l'adresse (optionnel mais recommandé)
            let latitude = null;
            let longitude = null;
            let geocoded = false;

            if (manualData.address_line1 && manualData.city) {
                try {
                    const coords = await this.geocodeAddress(
                        `${manualData.address_line1}, ${manualData.city}, ${manualData.postal_code || ''}`
                    );
                    if (coords) {
                        latitude = coords.lat;
                        longitude = coords.lng;
                        geocoded = true;
                    }
                } catch (geocodeError) {
                    console.log('⚠️ Géocodage échoué, continuation sans coordonnées');
                }
            }

            // 4. Récupérer secteur_id et difficulté
            const sectors: any = await query(
                'SELECT id, sector_name, difficulty FROM sector_difficulty WHERE sector_slug = ?',
                [manualData.sector_slug]
            );

            const sector = sectors.length ? sectors[0] : null;

            // 5. Générer slug unique
            const slug = await this.generateUniqueSlug(manualData.name, manualData.city);

            const establishmentId = uuidv4();

            // 6. Créer en base
            await query(
                `INSERT INTO establishments (
                    id, user_id, name, slug, address_line1, city, postal_code, country, country_code,
                    phone, website, sector_id, sector_name, sector_slug, sector_difficulty,
                    latitude, longitude, geocoded, platform_links, source_type, verification_status,
                    company_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    establishmentId,
                    userId,
                    manualData.name,
                    slug,
                    manualData.address_line1 || '',
                    manualData.city,
                    manualData.postal_code || '',
                    manualData.country || 'France',
                    'FR',
                    manualData.phone || '',
                    manualData.website || '',
                    sector?.id || null,
                    sector?.sector_name || manualData.sector_slug,
                    manualData.sector_slug,
                    sector?.difficulty || null,
                    latitude,
                    longitude,
                    geocoded,
                    JSON.stringify(manualData.platform_links || {}),
                    'manual',
                    'pending',
                    manualData.company_context || ''
                ]
            );

            console.log(`✅ Établissement créé manuellement : ID ${establishmentId}`);

            // 7. Logger l'action
            await this.logAction(establishmentId, userId, 'created', null, manualData);

            return {
                establishment_id: establishmentId,
                needs_validation: true,
                geocoded,
                warnings
            };

        } catch (error: any) {
            console.error('❌ Erreur création manuelle:', error);
            throw error;
        }
    }

    /**
     * Appel Google Places API - Text Search
     */
    async searchGooglePlaces(query: string): Promise<any[]> {
        try {
            const apiKey = await this.getActiveApiKey();
            await this.checkAndIncrementQuota();

            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=fr&region=fr`;
            const response = await fetch(url);
            const data = await response.json() as any;

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Places API error: ${data.status}`);
            }

            return data.results || [];

        } catch (error: any) {
            console.error('❌ Erreur Google Places Search:', error);
            throw error;
        }
    }

    /**
     * Appel Google Places API - Place Details
     */
    async getGooglePlaceDetails(placeId: string): Promise<any> {
        try {
            const apiKey = await this.getActiveApiKey();
            await this.checkAndIncrementQuota();

            const fields = 'name,formatted_address,address_components,geometry,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,url';
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}&language=fr`;

            const response = await fetch(url);
            const data = await response.json() as any;

            if (data.status !== 'OK') {
                throw new Error(`Google Places Details API error: ${data.status}`);
            }

            return data.result;

        } catch (error: any) {
            console.error('❌ Erreur Google Places Details:', error);
            throw error;
        }
    }

    async extractPlaceIdFromUrl(url: string): Promise<string | null> {
        try {
            console.log('🔍 Tentative extraction place_id depuis:', url);

            // Short link recognition
            if (url.includes('maps.app.goo.gl') || url.includes('goo.gl') || url.includes('share.google')) {
                const response = await fetch(url, {
                    redirect: 'follow',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                url = response.url;
                console.log('🔗 URL redirigée:', url);
            }

            // Pattern 0: Explicit ChIJ (Priority)
            const chijRegex = /(ChIJ[A-Za-z0-9_-]{23})/;
            const match0 = url.match(chijRegex);
            if (match0) {
                console.log('✅ Trouvé ChIJ direct:', match0[1]);
                return match0[1];
            }

            // Pattern 1: Standard !1s... (often ChIJ but sometimes hex)
            const placeIdRegex = /!1s([A-Za-z0-9_:-]+)/;
            const match1 = url.match(placeIdRegex);
            if (match1) {
                const pid = match1[1].split(':')[0];
                if (pid.startsWith('ChIJ')) {
                    console.log('✅ Trouvé ChIJ via !1s:', pid);
                    return pid;
                }
            }

            // Pattern 2: query_place_id or place_id in query
            try {
                const urlObj = new URL(url);
                const pid = urlObj.searchParams.get('place_id') || urlObj.searchParams.get('query_place_id');
                if (pid && pid.startsWith('ChIJ')) {
                    console.log('✅ Trouvé ChIJ via query param:', pid);
                    return pid;
                }
            } catch (e) { }

            // If we have a query or a KG ID but NO ChIJ, we return the query string
            // so the calling function can try a text search.
            const urlObj = new URL(url);
            const queryParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
            if (queryParam) {
                console.log('ℹ️ Aucun ChIJ trouvé, mais une requête est présente:', queryParam);
                return `SEARCH:${queryParam}`;
            }

            const kgs = urlObj.searchParams.get('kgs') || urlObj.searchParams.get('kgmid');
            if (kgs) {
                console.log('ℹ️ Aucun ChIJ trouvé, mais un KG ID est présent:', kgs);
                // Return search with the KG ID as it's very specific
                return `SEARCH:${kgs}`;
            }

            console.warn('⚠️ Aucun place_id ou requête de recherche trouvé dans l\'URL finale:', url);
            return null;
        } catch (error: any) {
            console.error('❌ Erreur extraction place_id:', error);
            return null;
        }
    }

    /**
     * Extraire données structurées depuis Google Place Details
     */
    extractDataFromGooglePlace(placeDetails: any): any {
        const addressComponents = placeDetails.address_components || [];

        let streetNumber = '';
        let route = '';
        let city = '';
        let postalCode = '';
        let region = '';

        for (const component of addressComponents) {
            const types = component.types;
            if (types.includes('street_number')) streetNumber = component.long_name;
            if (types.includes('route')) route = component.long_name;
            if (types.includes('locality')) city = component.long_name;
            if (types.includes('postal_code')) postalCode = component.long_name;
            if (types.includes('administrative_area_level_1')) region = component.long_name;
        }

        const addressLine1 = `${streetNumber} ${route}`.trim();

        return {
            name: placeDetails.name,
            address_line1: addressLine1 || placeDetails.formatted_address,
            city: city || 'N/A',
            postal_code: postalCode,
            region,
            phone: placeDetails.formatted_phone_number || null,
            website: placeDetails.website || null,
            latitude: placeDetails.geometry?.location?.lat || null,
            longitude: placeDetails.geometry?.location?.lng || null
        };
    }

    /**
     * Géocoder une adresse
     */
    async geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
        try {
            const apiKey = await this.getActiveApiKey();
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=fr`;

            const response = await fetch(url);
            const data = await response.json() as any;

            if (data.status === 'OK' && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return { lat: location.lat, lng: location.lng };
            }

            return null;
        } catch (error: any) {
            console.error('❌ Erreur géocodage:', error);
            return null;
        }
    }

    /**
     * Validation des données manuelles
     */
    validateManualData(data: any): void {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length < 2) errors.push('Le nom est obligatoire (min 2 caractères)');
        if (!data.city || data.city.trim().length < 2) errors.push('La ville est obligatoire');
        if (!data.sector_slug) errors.push('Le secteur d\'activité est obligatoire');

        if (errors.length > 0) {
            throw new Error(`Validation échouée : ${errors.join(', ')}`);
        }
    }

    /**
     * Générer un slug unique
     */
    async generateUniqueSlug(name: string, city: string): Promise<string> {
        const baseSlug = this.slugify(`${name} ${city}`);
        let slug = baseSlug;
        let counter = 1;

        while (await this.slugExists(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        return slug;
    }

    slugify(text: string): string {
        return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
            .replace(/[^a-z0-9]+/g, '-') // special chars
            .replace(/^-+|-+$/g, ''); // start/end dash
    }

    async slugExists(slug: string): Promise<boolean> {
        const result: any = await query('SELECT COUNT(*) as count FROM establishments WHERE slug = ?', [slug]);
        return result[0].count > 0;
    }

    async findByGooglePlaceId(placeId: string): Promise<any | null> {
        const result: any = await query('SELECT * FROM establishments WHERE google_place_id = ?', [placeId]);
        return result.length ? result[0] : null;
    }

    async findPotentialDuplicates(name: string, city: string): Promise<any[]> {
        const result: any = await query(
            `SELECT id, name, city, address_line1 
             FROM establishments 
             WHERE LOWER(city) = LOWER(?) 
               AND (LOWER(name) = LOWER(?) OR name LIKE ?)
             LIMIT 5`,
            [city, name, `%${name}%`]
        );
        return result;
    }

    async logAction(estId: string, userId: string, action: string, oldData: any, newData: any): Promise<void> {
        await query(
            `INSERT INTO establishment_verification_log 
            (establishment_id, action, performed_by, old_data, new_data) 
            VALUES (?, ?, ?, ?, ?)`,
            [estId, action, userId, oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null]
        );
    }

    async getActiveApiKey(): Promise<string> {
        const result: any = await query('SELECT api_key FROM google_places_config WHERE is_active = true LIMIT 1');
        if (!result.length) {
            // Fallback to env if nothing in DB yet
            if (process.env.GOOGLE_PLACES_API_KEY) return process.env.GOOGLE_PLACES_API_KEY;
            throw new Error('Aucune clé Google Places API configurée');
        }
        return result[0].api_key;
    }

    async checkAndIncrementQuota(): Promise<void> {
        const configs: any = await query('SELECT * FROM google_places_config WHERE is_active = true LIMIT 1');
        if (!configs.length) return; // No config, no limit (or just fallback to env)

        const config = configs[0];
        const today = new Date().toISOString().split('T')[0];

        if (config.last_reset !== today) {
            await query('UPDATE google_places_config SET used_today = 1, last_reset = ? WHERE id = ?', [today, config.id]);
        } else {
            if (config.used_today >= config.daily_quota) throw new Error('Quota quotidien Google Places API atteint');
            await query('UPDATE google_places_config SET used_today = used_today + 1 WHERE id = ?', [config.id]);
        }
    }

    /**
     * Récupérer les établissements d'un utilisateur
     */
    async getUserEstablishments(userId: string) {
        return query('SELECT * FROM establishments WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    }

    /**
     * Récupérer les détails d'un établissement
     */
    async getEstablishmentById(id: string) {
        const results: any = await query('SELECT * FROM establishments WHERE id = ?', [id]);
        return results.length ? results[0] : null;
    }

    /**
     * Valider un établissement (Admin)
     */
    async verifyEstablishment(id: string, adminId: string, status: 'verified' | 'rejected', notes?: string) {
        const old: any = await this.getEstablishmentById(id);
        if (!old) throw new Error('Établissement introuvable');

        await query(
            'UPDATE establishments SET verification_status = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?, rejection_reason = ? WHERE id = ?',
            [status, adminId, status === 'rejected' ? notes : null, id]
        );

        await this.logAction(id, adminId, status === 'verified' ? 'verified' : 'rejected', old, { verification_status: status, notes });

        // TODO: Send email to user (optional but planned in User Request)
    }

    /**
     * Get all pending establishments for admin
     */
    async getPendingEstablishments() {
        return query(`
            SELECT e.*, u.full_name as artisan_name
            FROM establishments e
            JOIN users u ON e.user_id = u.id
            WHERE e.verification_status = 'pending'
            ORDER BY e.created_at ASC
        `);
    }
}

export const establishmentService = new EstablishmentService();
