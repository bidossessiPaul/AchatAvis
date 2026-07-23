// Guide complet de la mission Repost Vidéo — page PUBLIQUE (sans login),
// partageable dans les emails de campagne. Toutes les exigences validées
// avec Rasfa : compte fan dédié, 30 partages max par compte, 0,10€/partage,
// bonus selon les vues.

import React from 'react';
import {
    Video,
    Users,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Eye,
    MessageCircle,
    Link2,
    Subtitles,
    Sticker,
    PlayCircle,
    ArrowRight,
    Wallet,
} from 'lucide-react';
import './RepostGuidePublic.css';

// Lien de la vidéo tutoriel (à renseigner dès qu'elle est disponible —
// la section est masquée tant que la valeur est vide)
const TUTORIAL_VIDEO_URL = '';

const FAN_ACCOUNT_EXAMPLES = [
    '@achatavis_guide',
    '@achatavis_fan',
    '@achatavis_club',
    '@achatavis_top',
];

export const RepostGuidePublic: React.FC = () => {
    return (
        <div className="rgp-page">
            {/* Hero */}
            <header className="rgp-hero">
                <img src="/logo.png" alt="AchatAvis" className="rgp-logo" />
                <h1>Mission Repost Vidéo — Guide complet</h1>
                <p>
                    Repostez nos vidéos sur vos comptes fan TikTok / Instagram et soyez payé
                    pour chaque partage validé, puis en bonus selon les vues.
                </p>
                <a href="/guide/repost" className="rgp-btn-primary">
                    Poster une vidéo <ArrowRight size={18} />
                </a>
            </header>

            <main className="rgp-content">
                {/* Rémunération */}
                <section className="rgp-section">
                    <h2><Wallet size={22} /> Combien vous gagnez</h2>
                    <div className="rgp-pay-highlight">
                        <strong>0,10€</strong> par partage validé — pareil pour tout le monde,
                        peu importe le compte.
                    </div>
                    <div className="rgp-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Partages</th>
                                    <th>Gain</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>10 partages</td><td><strong>1€</strong></td></tr>
                                <tr><td>30 partages (max par compte)</td><td><strong>3€</strong></td></tr>
                                <tr><td>~100 partages sur 3 comptes</td><td><strong>~10€</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="rgp-pay-views">
                        <Eye size={18} />
                        <span>
                            Ensuite, <strong>c'est le nombre de vues qui paie</strong> : déclarez
                            régulièrement les vues de vos vidéos, plus elles en font, plus vous
                            gagnez de bonus.
                        </span>
                    </div>
                </section>

                {/* Règles */}
                <section className="rgp-section">
                    <h2><CheckCircle2 size={22} /> Les règles</h2>
                    <ul className="rgp-rules">
                        <li>
                            <Users size={16} />
                            <span>
                                <strong>Créez un compte fan dédié</strong> — n'utilisez pas votre
                                compte personnel. Le nom du compte doit inclure <strong>achatavis</strong>,
                                par exemple : {FAN_ACCOUNT_EXAMPLES.map((n, i) => (
                                    <React.Fragment key={n}>
                                        <code>{n}</code>{i < FAN_ACCOUNT_EXAMPLES.length - 1 ? ', ' : ''}
                                    </React.Fragment>
                                ))}
                            </span>
                        </li>
                        <li>
                            <Video size={16} />
                            <span><strong>Plateformes :</strong> TikTok et Instagram.</span>
                        </li>
                        <li>
                            <CheckCircle2 size={16} />
                            <span>
                                La même vidéo peut être publiée <strong>jusqu'à 30 fois par compte</strong>.
                            </span>
                        </li>
                        <li>
                            <Users size={16} />
                            <span>
                                Vous pouvez avoir <strong>plusieurs comptes fan</strong> (par exemple 3)
                                — chaque compte doit être ajouté et approuvé sur la plateforme.
                            </span>
                        </li>
                    </ul>
                </section>

                {/* Avant de publier */}
                <section className="rgp-section">
                    <h2><Subtitles size={22} /> Avant de publier — obligatoire</h2>
                    <div className="rgp-steps">
                        <div className="rgp-step">
                            <Subtitles size={18} />
                            <span>Ajoutez des <strong>sous-titres</strong> à la vidéo.</span>
                        </div>
                        <div className="rgp-step">
                            <Sticker size={18} />
                            <span>Ajoutez des <strong>stickers</strong>.</span>
                        </div>
                        <div className="rgp-step">
                            <Link2 size={18} />
                            <span>
                                Mettez le <strong>lien du site sur la vidéo</strong> ET en
                                <strong> premier commentaire</strong> (le lien est fourni dans la mission).
                            </span>
                        </div>
                        <div className="rgp-step">
                            <MessageCircle size={18} />
                            <span>
                                <strong>Adaptez la description</strong> proposée avec vos propres mots —
                                ne copiez jamais le texte tel quel.
                            </span>
                        </div>
                    </div>
                </section>

                {/* Après publication */}
                <section className="rgp-section">
                    <h2><MessageCircle size={22} /> Après publication</h2>
                    <div className="rgp-steps">
                        <div className="rgp-step">
                            <MessageCircle size={18} />
                            <span>
                                <strong>Répondez aux questions dans les commentaires</strong> de votre
                                vidéo — c'est ce qui fait vivre le post.
                            </span>
                        </div>
                        <div className="rgp-step">
                            <TrendingUp size={18} />
                            <span>
                                Envoyez la <strong>preuve du repost</strong> (lien + capture d'écran)
                                depuis votre espace guide, puis <strong>déclarez vos vues
                                régulièrement</strong> pour toucher les bonus.
                            </span>
                        </div>
                    </div>
                </section>

                {/* À ne pas faire */}
                <section className="rgp-section">
                    <h2><XCircle size={22} /> À ne jamais faire</h2>
                    <ul className="rgp-rules rgp-rules-bad">
                        <li><XCircle size={16} /><span>Poster depuis votre <strong>compte personnel</strong>.</span></li>
                        <li><XCircle size={16} /><span>Publier <strong>sans sous-titres, sans stickers ou sans le lien du site</strong>.</span></li>
                        <li><XCircle size={16} /><span>Copier la description <strong>sans l'adapter</strong>.</span></li>
                        <li><XCircle size={16} /><span>Dépasser <strong>30 publications de la même vidéo</strong> sur un même compte.</span></li>
                    </ul>
                </section>

                {/* Tutoriel */}
                {TUTORIAL_VIDEO_URL && (
                    <section className="rgp-section">
                        <h2><PlayCircle size={22} /> Tutoriel vidéo</h2>
                        <p>Regardez le tutoriel complet avant votre premier repost :</p>
                        <a href={TUTORIAL_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="rgp-btn-secondary">
                            <PlayCircle size={18} /> Voir le tutoriel
                        </a>
                    </section>
                )}

                {/* Comment être payé */}
                <section className="rgp-section">
                    <h2><Wallet size={22} /> Comment être payé</h2>
                    <ol className="rgp-ordered">
                        <li>Connectez-vous à votre espace guide sur <strong>manager.achatavis.com</strong>.</li>
                        <li>Ajoutez votre (vos) compte(s) fan dans la section <strong>Repost Social</strong> — validation sous 24-48h.</li>
                        <li>Téléchargez la vidéo de la mission, publiez-la en respectant les règles ci-dessus.</li>
                        <li>Envoyez la preuve (lien du post + capture). Une fois validée, <strong>0,10€ sont crédités sur votre solde</strong>.</li>
                        <li>Déclarez vos vues au fil du temps pour débloquer les bonus.</li>
                    </ol>
                    <a href="/guide/repost" className="rgp-btn-primary">
                        Commencer maintenant <ArrowRight size={18} />
                    </a>
                </section>
            </main>

            <footer className="rgp-footer">
                &copy; {new Date().getFullYear()} AchatAvis — Vos réseaux sociaux valent de l'argent.
            </footer>
        </div>
    );
};
