import { GROUP1_EXAMPLES } from './group1_artisans_deplacement';
import { GROUP2_EXAMPLES } from './group2_accueil_physique';
import { GROUP3_EXAMPLES } from './group3_services_pro';
import { GROUP4_EXAMPLES } from './group4_ecommerce_online';

// Mapping sectorSlug → groupe d'exemples
const SECTOR_TO_GROUP: Record<string, string[]> = {
    // Groupe 1 — Artisans déplacement chez le client
    plomberie:                  GROUP1_EXAMPLES,
    electricite:                GROUP1_EXAMPLES,
    'chauffage-climo':          GROUP1_EXAMPLES,
    assainissement:             GROUP1_EXAMPLES,
    'anti-nuisible':            GROUP1_EXAMPLES,
    'toiture-couverture':       GROUP1_EXAMPLES,
    couvreur:                   GROUP1_EXAMPLES,
    batiment:                   GROUP1_EXAMPLES,
    'entrepreneur-general':     GROUP1_EXAMPLES,
    maconnerie:                 GROUP1_EXAMPLES,
    paysagiste:                 GROUP1_EXAMPLES,
    'jardinage-paysage':        GROUP1_EXAMPLES,
    demenagement:               GROUP1_EXAMPLES,
    peinture:                   GROUP1_EXAMPLES,
    peintre:                    GROUP1_EXAMPLES,

    // Groupe 2 — Établissements avec accueil physique
    restaurant:                         GROUP2_EXAMPLES,
    coiffure:                           GROUP2_EXAMPLES,
    fleuriste:                          GROUP2_EXAMPLES,
    boutique:                           GROUP2_EXAMPLES,
    automobile:                         GROUP2_EXAMPLES,
    'marchand-de-voitures-doccasion':   GROUP2_EXAMPLES,
    animalerie:                         GROUP2_EXAMPLES,
    orthodontiste:                      GROUP2_EXAMPLES,
    medical:                            GROUP2_EXAMPLES,
    medecin:                            GROUP2_EXAMPLES,

    // Groupe 3 — Services professionnels et conseil
    immobilier:                         GROUP3_EXAMPLES,
    juridique:                          GROUP3_EXAMPLES,
    'courtier-en-credit-et-assurance':  GROUP3_EXAMPLES,
    courtier:                           GROUP3_EXAMPLES,
    'expert-comptable':                 GROUP3_EXAMPLES,
    'centre-de-formation':              GROUP3_EXAMPLES,
    formation:                          GROUP3_EXAMPLES,
    'marketing-web':                    GROUP3_EXAMPLES,

    // Groupe 4 — E-commerce et services en ligne
    'e-commerce':   GROUP4_EXAMPLES,
    ecommerce:      GROUP4_EXAMPLES,
    voyage:         GROUP4_EXAMPLES,
    loisirs:        GROUP4_EXAMPLES,
};

// Retourne des exemples sectoriels mélangés.
// On injecte toujours PLUS d'exemples que d'avis à générer :
//   - quantity × 1.5, arrondi au supérieur
//   - plafonné au total du groupe (150 max)
// Cela garantit que chaque avis du batch peut s'appuyer sur un exemple unique différent.
export function getExamplesForSector(sectorSlug: string | undefined, quantity: number): string[] {
    const pool = (sectorSlug && SECTOR_TO_GROUP[sectorSlug]) || [];

    if (pool.length === 0) return [];

    const needed = Math.min(pool.length, Math.ceil(quantity * 1.5));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, needed);
}
