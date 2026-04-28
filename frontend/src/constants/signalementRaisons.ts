// Identique au backend : 9 raisons de signalement Google.
// Doit rester sync avec backend/src/constants/signalementRaisons.ts.

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

export const SIGNALEMENT_RAISONS_DESCRIPTIONS: Record<SignalementRaisonKey, string> = {
    HORS_SUJET: "Cet avis ne concerne pas une expérience vécue dans ou avec cette entreprise.",
    COURRIER_INDESIRABLE: "Cet avis provient d'un robot, d'un faux compte ou contient des publicités et des promotions.",
    CONFLIT_INTERETS: "L'avis provient d'une personne affiliée à l'entreprise ou à une entreprise concurrente.",
    IMPIETE: "Cet avis contient des jurons ou un langage pornographique ou sexuellement explicite.",
    NOCIF: "Cet avis contient des propos qui encouragent ou décrivent des actes de violence ou d'automutilation.",
    INTIMIDATION: "La critique s'attaque personnellement à une personne en particulier.",
    DISCRIMINATION: "L'avis contient des propos blessants à l'égard d'une personne ou d'un groupe en raison de son identité.",
    INFOS_PERSONNELLES: "L'avis contient des informations personnelles, telles qu'une adresse ou un numéro de téléphone.",
    PAS_UTILE: "Les avis n'aident pas les gens à décider s'ils doivent aller à cet endroit.",
};
