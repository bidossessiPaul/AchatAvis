import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    Megaphone, ShieldCheck, FileText, ChevronDown, ChevronUp,
    AlertTriangle, BookOpen, Info, Award, Bell
} from 'lucide-react';
import { communiquesApi } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface Communique {
    id: string;
    title: string;
    subtitle: string | null;
    date_label: string | null;
    icon: string;
    accent_color: string;
    content: string;
    is_published: number;
    created_at: string;
}

const iconFor = (key: string, size = 24) => {
    const map: Record<string, React.ReactNode> = {
        Megaphone: <Megaphone size={size} />,
        ShieldCheck: <ShieldCheck size={size} />,
        FileText: <FileText size={size} />,
        AlertTriangle: <AlertTriangle size={size} />,
        BookOpen: <BookOpen size={size} />,
        Info: <Info size={size} />,
        Award: <Award size={size} />,
        Bell: <Bell size={size} />,
    };
    return map[key] || <Megaphone size={size} />;
};

export const CommuniquesPage: React.FC = () => {
    const [items, setItems] = useState<Communique[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await communiquesApi.listPublished();
                setItems(data);
                // Auto-expand the first (most recent / first sort_order)
                if (data && data.length > 0) setExpanded(data[0].id);
            } catch (err) {
                console.error('Failed to load communiques:', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

    return (
        <DashboardLayout title="Communiqués officiels">
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                    color: 'white',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Megaphone size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                            Communiqués officiels
                        </h1>
                        <p style={{ margin: '0.4rem 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                            Annonces, mises à jour des règles et informations importantes
                            de l'équipe AchatAvis. Merci de lire attentivement.
                        </p>
                    </div>
                </div>

                {/* Communiques list */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <LoadingSpinner size="lg" text="Chargement des communiqués..." />
                    </div>
                ) : items.length === 0 ? (
                    <div style={{
                        background: 'white',
                        padding: '3rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#64748b'
                    }}>
                        <Megaphone size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p style={{ margin: 0 }}>Aucun communiqué pour le moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {items.map(c => {
                            const isOpen = expanded === c.id;
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        border: `2px solid ${isOpen ? c.accent_color : '#e2e8f0'}`,
                                        overflow: 'hidden',
                                        transition: 'border-color 0.2s'
                                    }}
                                >
                                    <button
                                        onClick={() => toggle(c.id)}
                                        style={{
                                            width: '100%',
                                            padding: '1.25rem 1.5rem',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '12px',
                                            background: `${c.accent_color}15`,
                                            color: c.accent_color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {iconFor(c.icon)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '0.75rem', fontWeight: 700,
                                                color: c.accent_color,
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                                marginBottom: '2px'
                                            }}>
                                                Communiqué officiel{c.date_label ? ` · ${c.date_label}` : ''}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                                                {c.title}
                                            </div>
                                            {c.subtitle && (
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                                    {c.subtitle}
                                                </div>
                                            )}
                                        </div>
                                        {isOpen
                                            ? <ChevronUp size={20} style={{ color: '#64748b' }} />
                                            : <ChevronDown size={20} style={{ color: '#64748b' }} />
                                        }
                                    </button>

                                    {isOpen && (
                                        <div style={{
                                            padding: '0 1.5rem 1.5rem',
                                            borderTop: '1px solid #f1f5f9'
                                        }}>
                                            <div
                                                style={{ paddingTop: '1.25rem', lineHeight: 1.7, color: '#334155' }}
                                                dangerouslySetInnerHTML={{ __html: c.content }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default CommuniquesPage;
