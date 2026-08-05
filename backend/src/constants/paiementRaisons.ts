// Référentiel des raisons pour lesquelles un guide n'a pas été payé (ou payé
// partiellement) lors d'une session de paiement.
//
// La clé (TRANSACTION_REJETEE, ...) est ce qui est stocké dans
// payment_session_lines.failure_reason. Le label est affiché en UI : l'admin
// choisit, le guide voit.
//
// Liste arrêtée avec Maxime — calibrée sur les moyens de paiement réellement
// supportés par la plateforme : Wave, Mobile Money, PayPal, virement bancaire, crypto.

export const PAIEMENT_RAISONS_ECHEC = {
    // --- Problèmes techniques de transaction ---
    TRANSACTION_REJETEE: "Transaction échouée / rejetée",
    RESEAU_INDISPONIBLE: "Réseau ou service indisponible",
    NUMERO_MOBILE_INVALIDE: "Numéro Mobile Money / Wave invalide",
    PAYPAL_INVALIDE: "Compte PayPal invalide",
    INFOS_TRANSACTION_MANQUANTES: "Manque d'infos pour la transaction",

    // --- Coordonnées du guide ---
    COORDONNEES_ABSENTES: "Coordonnées de paiement non renseignées",
    NOM_BENEFICIAIRE_DIFFERENT: "Nom du bénéficiaire ne correspond pas",
    IBAN_INVALIDE: "IBAN / RIB invalide",
    MOYEN_INDISPONIBLE_PAYS: "Moyen de paiement indisponible dans le pays",

    // --- Décision ou blocage administratif ---
    SOUS_SEUIL_MINIMUM: "Montant sous le seuil minimum",
    PAIEMENT_PARTIEL: "Paiement partiel — reste reporté",
    COMPTE_SUSPENDU_KYC: "Compte suspendu / KYC en cours",
    REPORTE_CYCLE_SUIVANT: "Reporté au prochain cycle",

    // --- Cas non couvert ---
    AUTRE: "Autre (à préciser)",
} as const;

export type PaiementRaisonKey = keyof typeof PAIEMENT_RAISONS_ECHEC;

// Regroupement utilisé pour afficher le select par catégories côté admin.
export const PAIEMENT_RAISONS_GROUPES: { titre: string; cles: PaiementRaisonKey[] }[] = [
    {
        titre: "Problème technique",
        cles: [
            'TRANSACTION_REJETEE',
            'RESEAU_INDISPONIBLE',
            'NUMERO_MOBILE_INVALIDE',
            'PAYPAL_INVALIDE',
            'INFOS_TRANSACTION_MANQUANTES',
        ],
    },
    {
        titre: "Coordonnées du guide",
        cles: [
            'COORDONNEES_ABSENTES',
            'NOM_BENEFICIAIRE_DIFFERENT',
            'IBAN_INVALIDE',
            'MOYEN_INDISPONIBLE_PAYS',
        ],
    },
    {
        titre: "Décision administrative",
        cles: [
            'SOUS_SEUIL_MINIMUM',
            'PAIEMENT_PARTIEL',
            'COMPTE_SUSPENDU_KYC',
            'REPORTE_CYCLE_SUIVANT',
        ],
    },
    {
        titre: "Autre",
        cles: ['AUTRE'],
    },
];

// Raisons qui appellent une action du guide lui-même (il doit corriger ses infos).
// Sert à afficher un encart d'action côté guide plutôt qu'un simple constat.
export const RAISONS_ACTION_GUIDE: PaiementRaisonKey[] = [
    'NUMERO_MOBILE_INVALIDE',
    'PAYPAL_INVALIDE',
    'INFOS_TRANSACTION_MANQUANTES',
    'COORDONNEES_ABSENTES',
    'NOM_BENEFICIAIRE_DIFFERENT',
    'IBAN_INVALIDE',
    'MOYEN_INDISPONIBLE_PAYS',
];

export function isValidRaisonPaiement(key: string): key is PaiementRaisonKey {
    return key in PAIEMENT_RAISONS_ECHEC;
}

export function labelRaisonPaiement(key: string | null | undefined): string | null {
    if (!key) return null;
    return isValidRaisonPaiement(key) ? PAIEMENT_RAISONS_ECHEC[key] : key;
}
