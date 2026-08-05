import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { payoutApi } from '../../services/api';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    Search,
    Info
} from 'lucide-react';
import { showError } from '../../utils/Swal';
import './MyEarnings.css';
import '../guide/Submissions.css';

type Board = Awaited<ReturnType<typeof payoutApi.getPaymentBoard>>;

const STATUTS: Record<string, { bg: string; color: string; texte: string; Icone: any }> = {
    paid: { bg: '#dcfce7', color: '#166534', texte: 'Payé', Icone: CheckCircle2 },
    partial: { bg: '#ede9fe', color: '#6d28d9', texte: 'Partiel', Icone: CheckCircle2 },
    failed: { bg: '#fee2e2', color: '#991b1b', texte: 'Non payé', Icone: XCircle },
    pending: { bg: '#fef3c7', color: '#92400e', texte: 'Non traité', Icone: Clock },
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export const PaymentBoard: React.FC = () => {
    const [board, setBoard] = useState<Board | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recherche, setRecherche] = useState('');

    useEffect(() => {
        charger();
    }, []);

    const charger = async (sessionId?: string) => {
        setIsLoading(true);
        try {
            setBoard(await payoutApi.getPaymentBoard(sessionId));
        } catch {
            showError('Chargement impossible', 'Impossible de charger le tableau des paiements.');
        } finally {
            setIsLoading(false);
        }
    };

    const lignes = (board?.lines || []).filter(l =>
        l.guide_name.toLowerCase().includes(recherche.trim().toLowerCase())
    );
    const maLigne = (board?.lines || []).find(l => l.is_me);

    if (isLoading) {
        return (
            <DashboardLayout title="Tableau des paiements">
                <div className="loading-container"><div className="spinner"></div></div>
            </DashboardLayout>
        );
    }

    if (!board || !board.selected) {
        return (
            <DashboardLayout title="Tableau des paiements">
                <div className="submissions-main-card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                    <Calendar size={40} style={{ color: 'var(--gray-300)' }} />
                    <p style={{ marginTop: '0.75rem', fontWeight: 700 }}>Aucun paiement publié pour le moment</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                        Le tableau apparaîtra dès qu'une vague de paiement sera clôturée.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    const s = board.selected;

    return (
        <DashboardLayout title="Tableau des paiements">
            <div className="earnings-page">
                {/* Choix de la vague de paiement */}
                <div className="submissions-main-card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">
                                <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                Paiement du {formatDate(s.closed_at)}
                            </h3>
                            <p className="card-subtitle">
                                Qui a été payé lors de cette vague. Les coordonnées de paiement ne sont jamais affichées.
                            </p>
                        </div>
                    </div>

                    <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {board.sessions.length > 1 && (
                            <select
                                value={s.id}
                                onChange={(e) => charger(e.target.value)}
                                style={{
                                    padding: '0.6rem 0.85rem', borderRadius: '8px',
                                    border: '1px solid var(--gray-300)', fontWeight: 600,
                                    fontSize: '0.875rem', background: 'white', cursor: 'pointer',
                                    fontFamily: 'inherit', maxWidth: '100%'
                                }}
                            >
                                {board.sessions.map(o => (
                                    <option key={o.id} value={o.id}>
                                        {formatDate(o.closed_at)}{o.label ? ` — ${o.label}` : ''}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                            <input
                                type="text"
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                placeholder="Rechercher un nom..."
                                style={{
                                    width: '100%', padding: '0.6rem 0.85rem 0.6rem 2rem',
                                    borderRadius: '8px', border: '1px solid var(--gray-300)',
                                    fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Ma situation, mise en avant */}
                {maLigne && (() => {
                    const st = STATUTS[maLigne.status];
                    return (
                        <div style={{
                            marginBottom: '1.25rem', padding: '1rem 1.25rem',
                            borderRadius: '1rem', background: st.bg,
                            border: `1px solid ${st.color}33`
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: st.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Votre situation
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: st.color, marginTop: '4px' }}>
                                {st.texte} — {Number(maLigne.amount_paid).toFixed(2)}€ reçus sur {Number(maLigne.amount_due).toFixed(2)}€ dus
                            </div>
                            {maLigne.failure_reason_label && (
                                <div style={{ fontSize: '0.85rem', color: st.color, marginTop: '4px' }}>
                                    Motif : {maLigne.failure_reason_label}. Le montant reste dû et sera versé au prochain cycle.
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Statistiques de la vague */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    {[
                        { valeur: s.stats_guides_total, label: 'Guides', gradient: 'linear-gradient(135deg, #475569, #334155)', Icone: Users },
                        { valeur: s.stats_paid_count, label: 'Payés', gradient: 'linear-gradient(135deg, #059669, #047857)', Icone: CheckCircle2 },
                        { valeur: s.stats_failed_count, label: 'Non payés', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', Icone: XCircle },
                    ].map(k => (
                        <div key={k.label} style={{
                            background: k.gradient, borderRadius: '1rem', padding: '1rem 1.25rem',
                            color: 'white', flex: 1, minWidth: '110px'
                        }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{k.valeur}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tableau collectif */}
                <div className="submissions-main-card">
                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Guide</th>
                                    <th>Montant</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map(l => {
                                    const st = STATUTS[l.status];
                                    return (
                                        <tr
                                            key={l.id}
                                            style={l.is_me ? {
                                                background: '#fff8e1',
                                                outline: '2px solid #d4af7a',
                                                outlineOffset: '-2px'
                                            } : undefined}
                                        >
                                            <td>
                                                <span style={{ fontWeight: l.is_me ? 800 : 600 }}>
                                                    {l.guide_name}
                                                </span>
                                                {l.is_me && (
                                                    <span style={{
                                                        marginLeft: '8px', padding: '0.15rem 0.5rem',
                                                        borderRadius: '1rem', fontSize: '0.65rem',
                                                        fontWeight: 800, textTransform: 'uppercase',
                                                        background: '#d4af7a', color: 'white', whiteSpace: 'nowrap'
                                                    }}>
                                                        Vous
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 800, color: Number(l.amount_paid) > 0 ? '#059669' : 'var(--gray-400)' }}>
                                                {Number(l.amount_paid).toFixed(2)}€
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                                    backgroundColor: st.bg, color: st.color, whiteSpace: 'nowrap'
                                                }}>
                                                    <st.Icone size={12} />
                                                    {st.texte}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {lignes.length === 0 && (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                            Aucun guide ne correspond à cette recherche.
                        </div>
                    )}
                </div>

                <p style={{
                    marginTop: '1rem', fontSize: '0.78rem', color: 'var(--gray-500)',
                    display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: 1.45
                }}>
                    <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    Ce tableau est publié pour que chacun puisse vérifier les paiements de la vague.
                    Le motif d'un non-paiement n'est visible que par le guide concerné.
                </p>
            </div>
        </DashboardLayout>
    );
};
