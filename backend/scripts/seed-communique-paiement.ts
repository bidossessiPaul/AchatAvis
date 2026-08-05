/**
 * Publie le communiqué « Moyens de paiement » et bascule les guides sur le
 * nouveau système d'alerte (modal à la connexion au lieu de l'email).
 *
 * Le script marque d'abord tous les communiqués DÉJÀ publiés comme lus pour
 * tous les comptes existants : sans ça, la mise en service du modal ferait
 * ressortir des annonces vieilles de plusieurs mois. Puis il insère le nouveau
 * communiqué, seul non lu — donc seul à déclencher le pop-up.
 *
 * Idempotent : si le communiqué existe déjà, rien n'est fait (ni backfill,
 * ni insertion), pour ne pas marquer comme lu un communiqué publié entre-temps.
 *
 * Usage : npx tsx scripts/seed-communique-paiement.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/config/database';

const TITLE = 'Moyens de paiement : vérifiez vos informations';

// "août 2026" -> "Août 2026", pour rester cohérent avec les communiqués existants
const moisCourant = () => {
    const label = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const content = `
<p>Chaque mois, des paiements ne peuvent pas être envoyés. La raison est presque toujours la même : <strong>le moyen de paiement du guide est absent, incomplet ou erroné</strong>. Ce n'est pas un problème de solde, ni de validation d'avis — l'argent est prêt, mais nous n'avons pas où l'envoyer.</p>

<div style="padding: 1rem 1.25rem; background: #ecfdf5; border-left: 4px solid #047857; border-radius: 0 8px 8px 0; margin: 1.5rem 0; font-weight: 600; color: #14532d;">
Règle simple : pas de moyen de paiement complet et exact = pas de paiement possible.
</div>

<h3>💰 Où vérifier vos informations</h3>
<ol>
  <li>Connectez-vous à votre compte</li>
  <li>Ouvrez la page <strong>Mes gains</strong></li>
  <li>Dans l'encadré <strong>Moyen de paiement</strong>, cliquez sur <strong>Ajouter</strong> ou <strong>Modifier</strong></li>
  <li>Renseignez tous les champs, puis enregistrez</li>
</ol>
<p>Faites-le maintenant, même si vous pensez l'avoir déjà fait : une simple faute dans le numéro suffit à bloquer un virement.</p>

<h3>🇧🇯 Vous êtes au Bénin</h3>
<p>Utilisez un numéro <strong>Mobile Money</strong>. Les trois réseaux acceptés sont les plus simples pour recevoir de l'argent :</p>
<ul>
  <li><strong>MTN MoMo</strong></li>
  <li><strong>Moov Money</strong></li>
  <li><strong>Celtiis Cash</strong></li>
</ul>
<div style="padding: 1rem 1.25rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin: 1.25rem 0; color: #78350f;">
  <strong>⚠️ Le réseau est obligatoire</strong>
  <p style="margin: 0.5rem 0 0;">Un numéro seul ne suffit pas. Vous devez indiquer <strong>si c'est MTN, Moov ou Celtiis</strong>, sinon nous ne savons pas par quel canal envoyer l'argent et le paiement reste bloqué.</p>
</div>
<p>À vérifier avant d'enregistrer :</p>
<ul>
  <li>Le numéro est bien <strong>rattaché à un compte Mobile Money actif</strong> (pas une simple puce)</li>
  <li>Le numéro est écrit <strong>avec l'indicatif</strong> : +229 ...</li>
  <li>Le <strong>nom du bénéficiaire</strong> correspond exactement au nom enregistré sur le compte Mobile Money</li>
</ul>

<h3>🌍 Vous êtes hors du Bénin</h3>
<p>Pour les paiements internationaux, privilégiez <strong>PayPal</strong> : c'est le moyen le plus rapide et le plus fiable pour recevoir de l'argent depuis l'étranger. Indiquez l'<strong>adresse email exacte</strong> de votre compte PayPal.</p>
<p>Les autres options restent disponibles selon votre pays : Mobile Money local (Orange Money, Wave, Moov...) en précisant le réseau, ou virement bancaire avec IBAN.</p>

<h3>❌ Les erreurs qui bloquent un paiement</h3>
<ul>
  <li>Aucun moyen de paiement enregistré</li>
  <li>Numéro renseigné <strong>sans préciser le réseau</strong></li>
  <li>Numéro qui n'est pas un compte Mobile Money</li>
  <li>Nom du bénéficiaire différent du titulaire du compte</li>
  <li>Email PayPal mal orthographié ou compte PayPal non validé</li>
  <li>Ancien numéro non mis à jour après un changement d'opérateur</li>
</ul>

<div style="padding: 1rem 1.25rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin: 1.5rem 0; color: #1e3a8a;">
  <strong>📅 Nouveau rythme de paiement</strong>
  <p style="margin: 0.5rem 0 0;">Les paiements sont désormais effectués <strong>une seule fois par mois</strong>, en une seule vague. Si vos informations sont incomplètes le jour du traitement, votre paiement est reporté au mois suivant. D'où l'importance de vérifier dès aujourd'hui.</p>
</div>

<h3>🎬 Nouveauté : gagnez plus avec le repost vidéo</h3>
<p>La fonctionnalité <strong>Repost vidéo</strong> est maintenant disponible dans votre espace. Le principe est simple : vous repostez la vidéo que nous mettons à disposition sur vos réseaux sociaux, et vous êtes payé <strong>deux fois</strong> — une première fois dès que votre repost est validé, puis des <strong>bonus selon le nombre de vues</strong> de votre publication.</p>
<p>C'est le moyen le plus rapide d'augmenter vos gains ce mois-ci, sans avoir à rédiger d'avis supplémentaire. Rendez-vous dans la rubrique <strong>Repost Social</strong> de votre menu pour découvrir la vidéo en cours et lancer votre première mission.</p>

<p style="margin-top: 1.5rem;">Merci de prendre deux minutes pour vérifier vos informations de paiement. C'est la seule chose qui sépare votre solde de votre compte.</p>
<p><strong>— L'équipe AchatAvis</strong></p>
`;

async function main() {
    const connection = await pool.getConnection();
    try {
        const [existing]: any = await connection.query(
            `SELECT id FROM communiques WHERE title = ?`,
            [TITLE]
        );
        if (existing.length > 0) {
            console.log(`  - "${TITLE}" existe déjà, rien à faire`);
            return;
        }

        // Backfill : les communiqués déjà en ligne ne doivent pas ressurgir en
        // pop-up chez les guides le jour de la mise en service du modal.
        const [backfill]: any = await connection.query(
            `INSERT IGNORE INTO communique_reads (id, communique_id, user_id)
             SELECT UUID(), c.id, u.id
             FROM communiques c CROSS JOIN users u
             WHERE c.is_published = 1`
        );
        console.log(`  ✓ ${backfill.affectedRows} lecture(s) antérieure(s) enregistrée(s)`);

        await connection.query(
            `INSERT INTO communiques
             (id, title, subtitle, date_label, icon, accent_color, content, is_published, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                uuidv4(),
                TITLE,
                'MTN, Moov, Celtiis ou PayPal — et paiement une fois par mois',
                moisCourant(),
                'Wallet',
                '#047857',
                content.trim(),
                -1, // sort_order négatif : affiché en tête de liste
            ]
        );
        console.log(`  ✓ "${TITLE}" publié`);
        console.log('\n✅ Les guides verront le pop-up à leur prochaine connexion');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

main();
