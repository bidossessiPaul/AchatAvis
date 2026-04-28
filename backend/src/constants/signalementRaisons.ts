// Référentiel des 9 raisons de signalement Google.
// La clé (HORS_SUJET, ...) est ce qui est stocké dans signalement_avis.raison.
// Le label est affiché en UI (artisan choisit, guide voit, admin voit).
//
// Source : capture d'écran Google "Rapport d'examen" fournie par Maxime.

export const SIGNALEMENT_RAISONS = {
    HORS_SUJET: "Hors sujet",
    COURRIER_INDESIRABLE: "Courrier indésirable",
    CONFLIT_INTERETS: "Conflit d'intérêts",
    IMPIETE: "Impiété",
    NOCIF: "Nocif",
    INTIMIDATION: "Intimidation ou harcèlement",
    DISCRIMINATION: "Discrimination ou discours haineux",
    INFOS_PERSONNELLES: "Informations personnelles",
    PAS_UTILE: "Pas utile",
} as const;

export type SignalementRaisonKey = keyof typeof SIGNALEMENT_RAISONS;

// Description longue de chaque raison (texte Google) — utile en tooltip côté
// artisan quand il choisit, et côté guide pour comprendre la justification
// avant d'aller signaler.
export const SIGNALEMENT_RAISONS_DESCRIPTIONS: Record<SignalementRaisonKey, string> = {
    HORS_SUJET: "Cet avis ne concerne pas une expérience vécue dans ou avec cette entreprise.",
    COURRIER_INDESIRABLE: "Cet avis provient d'un robot, d'un faux compte ou contient des publicités et des promotions.",
    CONFLIT_INTERETS: "L'avis provient d'une personne affiliée à l'entreprise ou à une entreprise concurrente.",
    IMPIETE: "Cet avis contient des jurons ou un langage pornographique ou sexuellement explicite.",
    NOCIF: "Cet avis contient des propos qui encouragent, promeuvent ou fournissent des instructions concernant l'automutilation, le mauvais usage d'objets ou de substances dangereuses, ou qui décrivent ou encouragent des actes de violence explicites envers des personnes ou des animaux.",
    INTIMIDATION: "La critique s'attaque personnellement à une personne en particulier.",
    DISCRIMINATION: "L'avis contient des propos blessants à l'égard d'une personne ou d'un groupe en raison de son identité.",
    INFOS_PERSONNELLES: "L'avis contient des informations personnelles, telles qu'une adresse ou un numéro de téléphone.",
    PAS_UTILE: "Les avis n'aident pas les gens à décider s'ils doivent aller à cet endroit.",
};

export function isValidRaison(key: string): key is SignalementRaisonKey {
    return key in SIGNALEMENT_RAISONS;
}
