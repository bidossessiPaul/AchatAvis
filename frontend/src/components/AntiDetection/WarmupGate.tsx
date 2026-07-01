import React, { useEffect, useState, useCallback } from 'react';
import {
    AlertTriangle,
    MapPin,
    Navigation,
    Globe,
    Phone,
    CheckCircle2,
    Clock,
    ArrowRight,
    Ban,
    ExternalLink,
} from 'lucide-react';
import { guideService } from '../../services/guideService';
import { showError } from '../../utils/Swal';

// Échauffement obligatoire avant de poster un avis.
// Le guide doit visiter quelques autres fiches clients et y faire 3 interactions
// (Itinéraire, Site web, Contact) SANS y laisser d'avis. Génère du trafic réel et
// crédibilise son profil. Une fois l'échauffement terminé, onComplete() débloque la fiche cible.

type WarmupVisit = {
    id: string;
    order_id: string;
    company_name: string;
    google_business_url: string;
    city: string | null;
    sector_icon: string | null;
    sector_name: string | null;
    is_done: number;
};

// État local d'une visite en cours (timer + cases cochées).
type VisitState = {
    openedAt: number | null;   // timestamp d'ouverture de la fiche Google
    requiredSec: number;       // durée minimale tirée aléatoirement (15-25s)
    itin: boolean;
    site: boolean;
    contact: boolean;
    saving: boolean;
};

interface Props {
    orderId: string;
    targetCompany: string;
    onComplete: () => void;
}

export const WarmupGate: React.FC<Props> = ({ orderId, targetCompany, onComplete }) => {
    const [step, setStep] = useState<'loading' | 'intro' | 'visits' | 'done'>('loading');
    const [visits, setVisits] = useState<WarmupVisit[]>([]);
    const [requiredCount, setRequiredCount] = useState(0);
    const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
    const [states, setStates] = useState<Record<string, VisitState>>({});
    const [now, setNow] = useState(Date.now());

    // Charge l'état de l'échauffement au montage.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await guideService.getWarmup(orderId);
                if (cancelled) return;
                // Accès direct (quota du jour atteint, déjà fait, ou aucune fiche à réchauffer)
                if (!data.required || data.completed) {
                    onComplete();
                    return;
                }
                const v = data.visits || [];
                const done = new Set(v.filter(x => x.is_done).map(x => x.id));
                setVisits(v);
                setRequiredCount(data.requiredCount || v.length);
                setDoneIds(done);
                // Si déjà commencé, on saute l'intro
                setStep(done.size > 0 ? 'visits' : 'intro');
            } catch (err: any) {
                // En cas d'erreur, ne pas bloquer le guide : on laisse passer.
                console.error('Warmup load failed', err);
                onComplete();
            }
        })();
        return () => { cancelled = true; };
    }, [orderId, onComplete]);

    // Ticker 1s pour les countdowns en cours.
    useEffect(() => {
        if (step !== 'visits') return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [step]);

    const getState = (id: string): VisitState =>
        states[id] || { openedAt: null, requiredSec: 0, itin: false, site: false, contact: false, saving: false };

    const openFiche = (v: WarmupVisit) => {
        window.open(v.google_business_url, '_blank', 'noopener');
        // Durée minimale aléatoire 15-25s pour éviter un pattern détectable.
        const requiredSec = 15 + Math.floor(Math.random() * 11);
        setStates(prev => ({
            ...prev,
            [v.id]: { ...getState(v.id), openedAt: Date.now(), requiredSec },
        }));
    };

    const toggle = (id: string, key: 'itin' | 'site' | 'contact') => {
        setStates(prev => ({ ...prev, [id]: { ...getState(id), [key]: !getState(id)[key] } }));
    };

    const validateVisit = useCallback(async (v: WarmupVisit) => {
        const s = getState(v.id);
        setStates(prev => ({ ...prev, [v.id]: { ...s, saving: true } }));
        try {
            const res = await guideService.recordWarmupVisit(orderId, {
                visitId: v.id,
                didItinerary: s.itin,
                didWebsite: s.site,
                didContact: s.contact,
                durationSec: s.openedAt ? Math.floor((Date.now() - s.openedAt) / 1000) : 0,
            });
            setDoneIds(prev => new Set(prev).add(v.id));
            if (res.completed) {
                setStep('done');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message;
            if (msg === 'ACTIONS_REQUISES') showError('Actions manquantes', 'Effectue les 3 interactions sur la fiche avant de valider.');
            else if (msg === 'DUREE_INSUFFISANTE') showError('Trop rapide', 'Reste un peu plus longtemps sur la fiche avant de valider.');
            else showError('Validation impossible', msg || 'Réessaie dans un instant.');
            setStates(prev => ({ ...prev, [v.id]: { ...getState(v.id), saving: false } }));
        }
    }, [orderId, states]);

    const completedCount = doneIds.size;

    // --- Styles communs ---
    const overlay: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1.5rem', overflowY: 'auto',
    };
    const card: React.CSSProperties = {
        background: '#fff', borderRadius: '1.25rem', maxWidth: 640, width: '100%',
        margin: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
    };

    if (step === 'loading') {
        return (
            <div style={overlay}>
                <div style={{ ...card, padding: '3rem', textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, margin: '0 auto', borderRadius: '50%',
                        border: '3px solid #e2e8f0', borderTopColor: '#059669',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>Préparation…</p>
                </div>
            </div>
        );
    }

    // --- Écran d'intro (avertissement danger) ---
    if (step === 'intro') {
        return (
            <div style={overlay}>
                <div style={card}>
                    <div style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', padding: '1.5rem 1.75rem', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <AlertTriangle size={26} />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>À lire avant de commencer</h2>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem 1.75rem' }}>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
                            Avant de poster ton avis, tu dois <strong>réchauffer ton compte</strong> en visitant
                            quelques commerces. Sur ces fiches, comporte-toi comme un <strong>vrai client</strong> :
                        </p>

                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                                Tu dois faire ces 3 actions
                            </div>
                            {[
                                { icon: <Navigation size={16} />, label: 'Appuyer sur "Itinéraire"' },
                                { icon: <Globe size={16} />, label: 'Appuyer sur "Site web"' },
                                { icon: <Phone size={16} />, label: 'Appuyer sur "Appeler / Contact"' },
                            ].map((a, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontSize: '0.9rem', padding: '0.2rem 0', fontWeight: 600 }}>
                                    {a.icon} {a.label}
                                </div>
                            ))}
                        </div>

                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                                <Ban size={18} /> NE LAISSE AUCUN AVIS sur ces commerces
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.55 }}>
                                Ne note pas ces fiches, n'écris rien. Ton avis se pose <strong>uniquement</strong> sur
                                la fiche finale (<strong>{targetCompany}</strong>), à la fin du parcours.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep('visits')}
                            style={{
                                width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: 'none',
                                background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff',
                                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            }}
                        >
                            J'ai compris — commencer l'échauffement <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Écran final (transition vers le vrai avis) ---
    if (step === 'done') {
        return (
            <div style={overlay}>
                <div style={{ ...card, padding: '2.5rem 1.75rem', textAlign: 'center' }}>
                    <div style={{
                        width: 72, height: 72, margin: '0 auto 1.25rem', borderRadius: '50%',
                        background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <CheckCircle2 size={40} color="#16a34a" />
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                        Échauffement terminé !
                    </h2>
                    <p style={{ margin: '0 0 1.5rem', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Maintenant — et <strong>seulement</strong> maintenant — tu peux laisser ton avis sur la
                        fiche : <strong>{targetCompany}</strong>.
                    </p>
                    <button
                        onClick={onComplete}
                        style={{
                            width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: 'none',
                            background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff',
                            fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                    >
                        Accéder au modèle d'avis <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // --- Écran des visites ---
    return (
        <div style={overlay}>
            <div style={card}>
                <div style={{ padding: '1.5rem 1.75rem 1rem' }}>
                    <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        Échauffement — visite {requiredCount} commerces
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        Fais les <strong>3 actions</strong> sur chaque fiche. <strong style={{ color: '#dc2626' }}>Sans laisser d'avis.</strong>
                    </p>

                    {/* Barre de progression */}
                    <div style={{ marginTop: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                            <span>Progression</span>
                            <span>{completedCount} / {requiredCount}</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${requiredCount ? (completedCount / requiredCount) * 100 : 0}%`,
                                background: 'linear-gradient(90deg, #059669, #047857)', transition: 'width 0.3s',
                            }} />
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {visits.map((v) => {
                        const isDone = doneIds.has(v.id);
                        const s = getState(v.id);
                        const elapsed = s.openedAt ? Math.floor((now - s.openedAt) / 1000) : 0;
                        const remaining = Math.max(0, s.requiredSec - elapsed);
                        const timerDone = s.openedAt !== null && remaining === 0;
                        const allChecked = s.itin && s.site && s.contact;
                        const canValidate = timerDone && allChecked && !s.saving;

                        return (
                            <div key={v.id} style={{
                                border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                                background: isDone ? '#f0fdf4' : '#fff',
                                borderRadius: '1rem', padding: '1rem 1.15rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {v.sector_icon && <span>{v.sector_icon}</span>}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.company_name}</span>
                                        </div>
                                        {v.city && (
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: 2 }}>
                                                <MapPin size={13} /> {v.city}
                                            </div>
                                        )}
                                    </div>
                                    {isDone && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                            <CheckCircle2 size={18} /> Visitée
                                        </span>
                                    )}
                                </div>

                                {!isDone && (
                                    <>
                                        {s.openedAt === null ? (
                                            <button
                                                onClick={() => openFiche(v)}
                                                style={{
                                                    marginTop: '0.85rem', width: '100%', padding: '0.65rem',
                                                    borderRadius: '0.625rem', border: '1px solid #2383e2',
                                                    background: '#fff', color: '#2383e2', fontWeight: 700, fontSize: '0.88rem',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                                                }}
                                            >
                                                <ExternalLink size={16} /> Ouvrir la fiche Google
                                            </button>
                                        ) : (
                                            <div style={{ marginTop: '0.85rem' }}>
                                                {/* Timer */}
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                    padding: '0.45rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem',
                                                    background: timerDone ? '#f0fdf4' : '#fef3c7',
                                                    border: `1px solid ${timerDone ? '#bbf7d0' : '#fde68a'}`,
                                                    color: timerDone ? '#166534' : '#92400e',
                                                    fontSize: '0.8rem', fontWeight: 700,
                                                }}>
                                                    <Clock size={14} />
                                                    {timerDone
                                                        ? 'Temps écoulé — coche tes actions ci-dessous'
                                                        : <>Reste sur la fiche encore <strong style={{ marginLeft: 4 }}>{remaining}s</strong></>}
                                                </div>

                                                {/* Les 3 actions à cocher */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    {[
                                                        { key: 'itin' as const, icon: <Navigation size={15} />, label: 'J\'ai appuyé sur "Itinéraire"' },
                                                        { key: 'site' as const, icon: <Globe size={15} />, label: 'J\'ai appuyé sur "Site web"' },
                                                        { key: 'contact' as const, icon: <Phone size={15} />, label: 'J\'ai appuyé sur "Contact"' },
                                                    ].map(a => {
                                                        const checked = s[a.key];
                                                        return (
                                                            <label key={a.key} style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.55rem',
                                                                padding: '0.5rem 0.65rem', borderRadius: '0.5rem', cursor: 'pointer',
                                                                border: `1px solid ${checked ? '#059669' : '#e2e8f0'}`,
                                                                background: checked ? '#f0fdf4' : '#fff',
                                                                color: checked ? '#047857' : '#475569',
                                                                fontSize: '0.85rem', fontWeight: 600,
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggle(v.id, a.key)}
                                                                    style={{ width: 16, height: 16, accentColor: '#059669' }}
                                                                />
                                                                {a.icon} {a.label}
                                                            </label>
                                                        );
                                                    })}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, margin: '0.6rem 0' }}>
                                                    <Ban size={14} /> Ne laisse pas d'avis sur cette fiche
                                                </div>

                                                <button
                                                    onClick={() => validateVisit(v)}
                                                    disabled={!canValidate}
                                                    style={{
                                                        width: '100%', padding: '0.65rem', borderRadius: '0.625rem', border: 'none',
                                                        background: canValidate ? 'linear-gradient(135deg, #059669, #047857)' : '#cbd5e1',
                                                        color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                                                        cursor: canValidate ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    {s.saving ? 'Validation…' : 'Valider la visite'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
