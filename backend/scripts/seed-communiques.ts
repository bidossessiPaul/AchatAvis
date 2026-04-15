/**
 * Seed the 2 initial communiqués (identity verification + authenticity charter).
 * Idempotent: skips if a communiqué with the same title already exists.
 *
 * Usage: npx tsx scripts/seed-communiques.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/config/database';

const identityContent = `
<p>Dans le prolongement de notre engagement pour une plateforme <strong>fiable et transparente</strong>, nous mettons en place une nouvelle étape de vérification destinée à garantir l'identité réelle de chaque membre de la communauté AchatAvis.</p>

<div style="padding: 1rem 1.25rem; background: #eff6ff; border-left: 4px solid #0369a1; border-radius: 0 8px 8px 0; margin: 1.5rem 0; font-weight: 600; color: #1e3a8a;">
Règle fondamentale : chaque compte Local Guide AchatAvis doit être lié à une personne réelle et identifiable.
</div>

<h3>✅ Qui est concerné ?</h3>
<ul>
  <li><strong>Tout guide n'ayant encore publié aucun avis</strong> sur la plateforme</li>
  <li><strong>Tous les nouveaux inscrits</strong>, à partir de ce jour</li>
</ul>
<p><em>Les guides ayant déjà des avis validés ne sont pas concernés — la confiance est déjà établie.</em></p>

<h3>📋 Procédure à suivre</h3>
<ol>
  <li>Connectez-vous à votre compte sur <strong>https://manager.achatavis.com</strong></li>
  <li>Vous serez automatiquement redirigé vers la page de vérification d'identité</li>
  <li>Téléversez une photo ou un scan de votre <strong>pièce d'identité officielle</strong> : CNI, passeport ou permis de conduire</li>
  <li>Formats acceptés : JPG, PNG, WEBP, PDF (max. 8 Mo)</li>
  <li>Cliquez sur « Envoyer ma pièce d'identité »</li>
</ol>

<div style="padding: 1rem 1.25rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 1.5rem 0;">
  <strong style="color: #166534;">⏱️ Délai de traitement : 24h maximum</strong>
  <p style="margin: 0.5rem 0 0; color: #14532d;">Dès validation, votre compte est automatiquement réactivé. Votre solde et vos informations restent intégralement conservés.</p>
</div>

<h3>🔒 Protection de vos données</h3>
<ul>
  <li>Chiffrées et stockées de manière sécurisée</li>
  <li>Consultées uniquement par l'équipe de vérification AchatAvis</li>
  <li>Utilisées exclusivement pour confirmer votre identité — jamais partagées avec des tiers</li>
  <li>Conservées dans le respect du RGPD</li>
</ul>

<div style="padding: 1rem 1.25rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 1.5rem 0; color: #7f1d1d;">
  <strong>⚠️ Important</strong>
  <ul style="margin: 0.5rem 0 0;">
    <li>Cette étape est obligatoire et unique.</li>
    <li>Tout compte n'ayant pas soumis sa pièce restera bloqué.</li>
    <li>La falsification d'une pièce d'identité entraînera la suppression définitive du compte et un signalement aux autorités compétentes.</li>
  </ul>
</div>

<p>Merci de votre coopération. Cette mesure nous permet de bâtir ensemble une communauté <strong>fiable, professionnelle et durable</strong>.</p>
<p><em>Pour toute question, contactez le support AchatAvis.</em></p>
<p><strong>— L'équipe AchatAvis</strong></p>
`;

const charterContent = `
<p>En tant que membre de la communauté AchatAvis, vous contribuez à aider les consommateurs à découvrir des commerces et artisans de qualité dans leur quartier. Cette mission repose sur un principe fondamental : <strong>la sincérité</strong>.</p>

<p>Nous avons identifié des avis qui ne reflètent pas une expérience ou une observation réelle. Ces contenus nuisent à la crédibilité de toute la communauté et exposent leurs auteurs à des risques.</p>

<div style="padding: 1rem 1.25rem; background: #f0fdf4; border-left: 4px solid #047857; border-radius: 0 8px 8px 0; margin: 1.5rem 0; font-weight: 600; color: #14532d;">
Règle n°1 : Ne publiez que ce que vous avez réellement vécu, vu ou constaté par vous-même.
</div>

<h3 style="color: #047857;">✅ Bonnes pratiques – Avis acceptés</h3>

<div style="padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #14532d;">✓ Vous avez testé le service ou visité l'établissement</strong>
  <p style="margin: 0.5rem 0;">Partagez votre vraie expérience : accueil, qualité de la prestation, ambiance.</p>
  <p style="margin: 0; font-style: italic; color: #065f46;">Ex : « J'ai fait appel à ce serrurier pour un changement de serrure. Intervention en 30 min, tarif conforme au devis. Je recommande. »</p>
</div>

<div style="padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #14532d;">✓ Vous êtes passé devant le commerce (sans y entrer)</strong>
  <p style="margin: 0.5rem 0;">Décrivez uniquement ce que vous avez vu de l'extérieur.</p>
  <p style="margin: 0; font-style: italic; color: #065f46;">Ex : « Je passe régulièrement devant cette boulangerie. La vitrine est toujours soignée. »</p>
</div>

<div style="padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #14532d;">✓ Vous avez consulté leur présence en ligne</strong>
  <p style="margin: 0.5rem 0;">Partagez votre impression basée sur leur site, réseaux sociaux ou photos Google — en le précisant clairement.</p>
  <p style="margin: 0; font-style: italic; color: #065f46;">Ex : « D'après leurs photos Instagram, l'endroit a l'air lumineux. Leur communication est pro. »</p>
</div>

<div style="padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #14532d;">✓ Vous connaissez l'entreprise de réputation</strong>
  <p style="margin: 0.5rem 0;">Si des proches vous l'ont recommandée, dites-le honnêtement.</p>
  <p style="margin: 0; font-style: italic; color: #065f46;">Ex : « Plusieurs personnes m'ont recommandé ce plombier. Je n'ai pas encore fait appel mais les retours sont très positifs. »</p>
</div>

<h3 style="color: #b91c1c;">✗ Pratiques interdites – Tolérance zéro</h3>

<div style="padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #7f1d1d;">✗ Inventer une expérience fictive</strong>
  <p style="margin: 0.5rem 0; color: #991b1b;">Ne décrivez jamais un service comme si vous l'aviez utilisé alors que ce n'est pas le cas.</p>
  <p style="margin: 0; font-style: italic; color: #7f1d1d;">Ex interdit : « Super déménagement, équipe ponctuelle ! » → alors que vous n'y avez jamais fait appel.</p>
</div>

<div style="padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #7f1d1d;">✗ Décrire l'intérieur d'un lieu sans y être entré</strong>
  <p style="margin: 0.5rem 0; color: #991b1b;">Si vous n'avez pas franchi la porte, ne parlez pas de l'ambiance intérieure, du personnel ou de la décoration.</p>
  <p style="margin: 0; font-style: italic; color: #7f1d1d;">Ex interdit : « Super endroit, lumineux, personnel souriant » → alors que vous n'y êtes jamais allé.</p>
</div>

<div style="padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #7f1d1d;">✗ Ajouter des détails fictifs (noms, prix, dates)</strong>
  <p style="margin: 0.5rem 0; color: #991b1b;">Pas de faux prénoms, pas de faux montants, pas de fausses dates.</p>
  <p style="margin: 0; font-style: italic; color: #7f1d1d;">Ex interdit : « J'ai payé 45 € pour une coupe chez Karim » → alors que rien n'est réel.</p>
</div>

<div style="padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #7f1d1d;">✗ Copier ou reformuler l'avis d'une autre personne</strong>
  <p style="margin: 0.5rem 0 0; color: #991b1b;">Chaque contribution doit être personnelle, unique et rédigée par vous.</p>
</div>

<div style="padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0.75rem 0;">
  <strong style="color: #7f1d1d;">✗ Utiliser des formulations trompeuses</strong>
  <p style="margin: 0.5rem 0; color: #991b1b;">Ne laissez jamais croire que vous avez testé un service si ce n'est pas le cas.</p>
  <p style="margin: 0; font-style: italic; color: #7f1d1d;">Ex interdit : « J'y vais souvent, toujours satisfait » → alors que vous n'y êtes jamais allé.</p>
</div>

<div style="padding: 1rem 1.25rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin: 2rem 0 1rem; color: #78350f;">
  <strong>⚠️ Rappel important</strong>
  <p style="margin: 0.5rem 0 0;">La publication d'avis contenant des informations fausses peut constituer une <strong>pratique commerciale trompeuse au sens du Code de la consommation</strong>. Tout guide en infraction s'expose à la suspension immédiate de son compte, à la suppression de ses avis, et le cas échéant, à un signalement aux autorités compétentes.</p>
</div>
`;

async function main() {
    const connection = await pool.getConnection();
    try {
        const seeds = [
            {
                title: 'Vérification d\'identité obligatoire',
                subtitle: 'Sécurité des comptes Guides Locaux',
                date_label: 'Avril 2026',
                icon: 'ShieldCheck',
                accent_color: '#0369a1',
                content: identityContent.trim(),
                sort_order: 0,
            },
            {
                title: 'Charte de Qualité & d\'Authenticité des Avis',
                subtitle: 'Mise à jour des règles de publication',
                date_label: 'Avril 2026',
                icon: 'FileText',
                accent_color: '#047857',
                content: charterContent.trim(),
                sort_order: 1,
            },
        ];

        for (const s of seeds) {
            const [existing]: any = await connection.query(
                `SELECT id FROM communiques WHERE title = ?`,
                [s.title]
            );
            if (existing.length > 0) {
                console.log(`  - "${s.title}" already exists, skipping`);
                continue;
            }
            await connection.query(
                `INSERT INTO communiques
                 (id, title, subtitle, date_label, icon, accent_color, content, is_published, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                [uuidv4(), s.title, s.subtitle, s.date_label, s.icon, s.accent_color, s.content, s.sort_order]
            );
            console.log(`  ✓ "${s.title}" seeded`);
        }

        console.log('\n✅ Seed completed');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

main();
