// Ferme la session de paiement ouverte : fige les statistiques et rend le
// récapitulatif consultable par les guides concernés.
//
// Usage : npx tsx scripts/fermer-session.ts

import 'dotenv/config';
import * as service from '../src/services/paymentSessionService';

const main = async () => {
    const session = await service.getOpenSession();
    if (!session) { console.error('Aucune session ouverte.'); process.exit(1); }

    const fermee = await service.closeSession(
        session.id,
        session.opened_by,
        'Report du fichier de paiement du 30/07'
    );

    console.log('Session fermée.');
    console.log(`   Guides        : ${fermee.stats_guides_total}`);
    console.log(`   Payés         : ${fermee.stats_paid_count}`);
    console.log(`   Non payés     : ${fermee.stats_failed_count}`);
    console.log(`   Non traités   : ${fermee.stats_pending_count}`);
    console.log(`   Montant dû    : ${Number(fermee.stats_amount_due).toFixed(2)}EUR`);
    console.log(`   Montant versé : ${Number(fermee.stats_amount_paid).toFixed(2)}EUR`);
    process.exit(0);
};

main().catch(err => { console.error('Erreur :', err.message); process.exit(1); });
