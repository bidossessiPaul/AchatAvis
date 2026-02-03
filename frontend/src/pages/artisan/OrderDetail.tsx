import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { artisanService } from '../../services/artisanService';
import { ReviewOrder, ReviewProposal } from '../../types';
import { PremiumBlurOverlay } from '../../components/layout/PremiumBlurOverlay';
import { useAuthStore } from '../../context/authStore';
import {
    ArrowLeft,
    Calendar,
    Link as LinkIcon,
    Trash2,
    AlertTriangle,
    MessageSquare,
    Zap,
    ExternalLink,
    CheckCircle,
    Droplets,
    Zap as ElecIcon,
    Flame,
    Home,
    Search,
    Trees,
    Brush,
    Truck,
    Briefcase
} from 'lucide-react';

const getTradeInfo = (trade: string) => {
    const t = trade?.toLowerCase() || '';
    if (t.includes('plomb') || t.includes('plumb')) return { color: '#2563eb', bg: '#eff6ff', icon: <Droplets size={20} /> };
    if (t.includes('elect')) return { color: '#d97706', bg: '#fffbeb', icon: <ElecIcon size={20} /> };
    if (t.includes('chauff')) return { color: '#ea580c', bg: '#fff7ed', icon: <Flame size={20} /> };
    if (t.includes('couvr')) return { color: '#4b5563', bg: '#f3f4f6', icon: <Home size={20} /> };
    if (t.includes('vitr')) return { color: '#0891b2', bg: '#ecfeff', icon: <Search size={20} /> };
    if (t.includes('paysag')) return { color: '#16a34a', bg: '#f0fdf4', icon: <Trees size={20} /> };
    if (t.includes('menag')) return { color: '#7c3aed', bg: '#f5f3ff', icon: <Brush size={20} /> };
    if (t.includes('demenag')) return { color: '#92400e', bg: '#fffaf0', icon: <Truck size={20} /> };
    return { color: '#FF6B35', bg: '#fff1f2', icon: <Briefcase size={20} /> };
};

export const OrderDetail: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<(ReviewOrder & { proposals: ReviewProposal[] }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuthStore();

    const tradeInfo = getTradeInfo(order?.sector || order?.company_name || '');

    useEffect(() => {
        if (orderId) {
            loadOrder(orderId);
        }
    }, [orderId]);

    const loadOrder = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await artisanService.getOrder(id);
            setOrder(data);
        } catch (err: any) {
            console.error("Failed to load order", err);
            setError("Impossible de charger les détails de cette soufiche.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!order || !window.confirm("Êtes-vous sûr de vouloir supprimer cette soufiche ? Cette action est irréversible.")) {
            return;
        }

        setIsDeleting(true);
        try {
            await artisanService.deleteOrder(order.id);
            navigate('/artisan');
        } catch (err: any) {
            console.error("Failed to delete order", err);
            setError("Erreur lors de la suppression de la soufiche.");
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Chargement...">
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: '#6b7280' }}>Récupération des détails...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!order) {
        return (
            <DashboardLayout title="Erreur">
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <AlertTriangle size={48} color="#FF6B35" style={{ margin: '0 auto 1rem' }} />
                    <h3>Commande introuvable</h3>
                    <button onClick={() => navigate('/artisan')} className="btn-back" style={{ marginTop: '1rem' }}>
                        Retour au tableau de bord
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={`Détails : ${order.company_name || 'Sans nom'}`}>
            <PremiumBlurOverlay isActive={(user?.fiches_allowed || 0) > 0}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        onClick={() => navigate('/artisan')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <ArrowLeft size={18} /> Retour
                    </button>

                    <button
                        onClick={() => navigate(`/artisan/submit/${order.id}`)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: order.proposals && order.proposals.length < (order.quantity || 0) ? '#fff7ed' : '#f3f4f6',
                            border: order.proposals && order.proposals.length < (order.quantity || 0) ? '1px solid #ea580c' : 'none',
                            color: order.proposals && order.proposals.length < (order.quantity || 0) ? '#ea580c' : '#111827',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = order.proposals && order.proposals.length < (order.quantity || 0) ? '#ffedd5' : '#e5e7eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = order.proposals && order.proposals.length < (order.quantity || 0) ? '#fff7ed' : '#f3f4f6'}
                    >
                        {order.proposals && order.proposals.length < (order.quantity || 0) ? (
                            <>
                                <AlertTriangle size={18} />
                                Compléter ({((order.quantity || 0) - order.proposals.length)} manquants)
                            </>
                        ) : (
                            <>
                                <Zap size={18} color={tradeInfo.color} />
                                {['in_progress', 'completed'].includes(order.status) ? 'Modifier la fiche & les avis' : 'Modifier & Régénérer'}
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fff1f2',
                        border: '1px solid #FF6B35',
                        color: '#FF6B35',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <AlertTriangle size={20} />
                        <span style={{ fontWeight: 600 }}>{error}</span>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
                    {/* Left Column: Proposals and Main Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Key Info Card */}
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        {getTradeInfo(order.sector || order.company_name || '').icon}
                                        <h1 style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#111827'
                                        }}>
                                            {order.company_name}
                                        </h1>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={14} /> {new Date(order.created_at).toLocaleDateString()}
                                        </span>
                                        {order.google_business_url && (
                                            <a
                                                href={order.google_business_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: tradeInfo.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}
                                            >
                                                <LinkIcon size={14} /> Voir sur Google
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <span style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    backgroundColor: order.status === 'completed' ? '#ecfdf5' : order.status === 'draft' ? '#f3f4f6' : '#fff7ed',
                                    color: order.status === 'completed' ? '#047857' : order.status === 'draft' ? '#4b5563' : '#c2410c'
                                }}>
                                    {order.status === 'draft' ? 'Brouillon' : order.status === 'submitted' ? 'Soumis' : order.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '1rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Secteur & Zones</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            backgroundColor: getTradeInfo(order.sector || '').bg,
                                            color: getTradeInfo(order.sector || '').color,
                                            textTransform: 'capitalize'
                                        }}>
                                            {order.sector || 'Non spécifié'}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>{order.zones || 'Toute la France'}</p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Objectif</h4>
                                    <p style={{ margin: 0, fontSize: '0.925rem' }}>{order.quantity} avis attendus</p>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>{order.reviews_received} avis reçus à ce jour</p>
                                </div>
                            </div>
                        </div>

                        {/* Proposals Section */}
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="#10b981" /> Avis Publiés ({order.proposals?.filter(p => p.submission_id).length})
                            </h2>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                marginBottom: '2.5rem'
                            }}>
                                {order.proposals && order.proposals.filter(p => p.submission_id).length > 0 ? (
                                    order.proposals.filter(p => p.submission_id).map((proposal) => (
                                        <div key={proposal.id} style={{
                                            background: 'white',
                                            padding: '1.5rem',
                                            borderRadius: '1rem',
                                            border: '1px solid #10b981',
                                            position: 'relative',
                                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.05)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>{proposal.author_name}</span>
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} style={{ color: i < (proposal.rating || 5) ? '#fbbf24' : '#d1d5db' }}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p style={{ margin: '0 0 1rem', color: '#4b5563', lineHeight: 1.6, fontSize: '0.95rem' }}>"{proposal.content}"</p>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingTop: '0.75rem',
                                                borderTop: '1px solid #f3f4f6'
                                            }}>
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                                    Publié le {new Date(proposal.submitted_at!).toLocaleDateString()}
                                                </span>
                                                <a
                                                    href={proposal.review_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        fontSize: '0.8125rem',
                                                        color: '#10b981',
                                                        textDecoration: 'none',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <ExternalLink size={14} /> Vérifier sur Google
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '1rem', border: '1px dashed #d1d5db' }}>
                                        <p style={{ color: '#6b7280', margin: 0 }}>Aucun avis n'a encore été publié.</p>
                                    </div>
                                )}
                            </div>

                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MessageSquare size={20} color={tradeInfo.color} /> Avis en Attente ({order.proposals?.filter(p => !p.submission_id).length})
                            </h2>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                paddingRight: '0.5rem',
                                scrollbarWidth: 'thin',
                                scrollbarColor: `${tradeInfo.color} #f3f4f6`
                            }}>
                                {order.proposals && order.proposals.filter(p => !p.submission_id).length > 0 ? (
                                    order.proposals.filter(p => !p.submission_id).map((proposal) => (
                                        <div key={proposal.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #f3f4f6', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>{proposal.author_name}</span>
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} style={{ color: i < (proposal.rating || 5) ? '#fbbf24' : '#d1d5db' }}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6, fontSize: '0.95rem' }}>"{proposal.content}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '1rem', border: '1px dashed #d1d5db' }}>
                                        <p style={{ color: '#6b7280', margin: 0 }}>Toutes les propositions ont été publiées.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Context & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Context Card */}
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #f3f4f6' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={18} color={tradeInfo.color} /> Contexte IA
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Ton des avis</label>
                                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>{order.desired_tone || 'Naturel'}</p>
                                </div>

                                {order.staff_names && (
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Collaborateurs</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {order.staff_names.split(',').map((name, i) => (
                                                <span key={i} style={{ background: '#f3f4f6', padding: '0.25rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    {name.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.5 }}>
                                        {order.company_context || 'Aucune description fournie.'}
                                    </p>
                                </div>

                                {order.specific_instructions && (
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Instructions</label>
                                        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#4b5563', fontStyle: 'italic', background: '#fffbeb', padding: '0.75rem', borderRadius: '0.5rem', borderLeft: '3px solid #fbbf24' }}>
                                            {order.specific_instructions}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div style={{ background: '#fff1f2', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #ffe4e6' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991b1b', marginBottom: '1rem', textTransform: 'uppercase' }}>Zone de danger</h3>
                            <p style={{ fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '1.25rem' }}>
                                La suppression de cette soufiche entraînera la suppression définitive de toutes les propositions d'avis associées.
                            </p>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'white',
                                    border: '1px solid #fca5a5',
                                    color: '#dc2626',
                                    borderRadius: '0.75rem',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#dc2626';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.color = '#dc2626';
                                }}
                            >
                                <Trash2 size={16} /> {isDeleting ? 'Suppression...' : 'Supprimer la soufiche'}
                            </button>
                        </div>
                    </div>
                </div>
            </PremiumBlurOverlay>
        </DashboardLayout>
    );
};
