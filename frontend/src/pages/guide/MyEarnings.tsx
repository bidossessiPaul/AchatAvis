import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { payoutApi } from '../../services/api';
import {
    Wallet,
    TrendingUp,
    Clock,
    AlertCircle,
    History,
    Calendar,
    CheckCircle2,
    RotateCw,
    AlertTriangle,
    CreditCard,
    Plus,
    X,
    Banknote,
    Smartphone,
    Flag
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import './MyEarnings.css';
import '../guide/Submissions.css'; // Reuse table and card styles

interface PayoutRequest {
    id: string;
    amount: number;
    status: 'pending' | 'paid' | 'refused' | 'in_revision';
    requested_at: string;
    processed_at?: string;
    admin_note?: string;
}

export const MyEarnings: React.FC = () => {
    const [stats, setStats] = useState<{ totalEarned: number, totalPaid: number, totalPending: number, sigPending: number, balance: number } | null>(null);
    const [bonusDetails, setBonusDetails] = useState<{ totalFromReviews: number; totalExtrasAdded: number; totalReversed: number; reversals: { amount: number; reason: string; created_at: string }[] } | null>(null);

    const [history, setHistory] = useState<PayoutRequest[]>([]);
    // Vagues de paiement fermées concernant ce guide : payé, partiel ou non payé + raison
    const [paymentSessions, setPaymentSessions] = useState<Awaited<ReturnType<typeof payoutApi.getPaymentSessions>>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<{ method: string, details: any } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [methodDetails, setMethodDetails] = useState<any>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsData, historyData, paymentData, bonusData, sessionsData] = await Promise.all([
                payoutApi.getEarnings(),
                payoutApi.getPayoutHistory(),
                payoutApi.getPaymentMethod(),
                payoutApi.getBonusDetails(),
                // Les vagues de paiement ne sont pas critiques pour l'écran : un
                // échec de cet appel ne doit pas vider les gains affichés.
                payoutApi.getPaymentSessions().catch(() => [])
            ]);
            setStats(statsData);
            setHistory(historyData);
            setBonusDetails(bonusData);
            setPaymentSessions(sessionsData);
            setPaymentMethod(paymentData);
            if (paymentData) {
                setSelectedMethod(paymentData.method);
                setMethodDetails(paymentData.details || {});
            }
        } catch (error) {
            showError('Chargement impossible', 'Erreur lors du chargement de vos gains');
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdrawRequest = async () => {
        if (!stats || Number(stats.balance) < 10) {
            showError('Montant insuffisant', 'Montant minimum de 10€ requis pour un retrait');
            return;
        }

        const result = await showConfirm(
            'Demande de retrait',
            `Voulez-vous lancer une demande de retrait pour la totalité de votre solde (${Number(stats.balance).toFixed(2)}€) ?`
        );

        if (!result.isConfirmed) return;

        setIsActionLoading(true);
        try {
            await payoutApi.requestPayout();
            showSuccess('Succès', 'Demande de retrait envoyée !');
            loadData(); // Refresh to see balance zero and new pending request
        } catch (error: any) {
            showError('Demande impossible', error.response?.data?.error || 'Erreur lors de la demande');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSavePaymentMethod = async () => {
        if (!selectedMethod) {
            showError('Moyen de paiement requis', 'Veuillez choisir un moyen de paiement');
            return;
        }

        // Validation stricte : un moyen de paiement incomplet est la première
        // cause de paiement non reçu. On bloque à la saisie plutôt qu'au virement.
        if (selectedMethod === 'mobile_money' || selectedMethod === 'wave') {
            if (!methodDetails.network?.trim()) {
                showError('Réseau manquant', 'Précisez le réseau : MTN, Moov, Celtiis, Orange, Wave...');
                return;
            }
            if (!methodDetails.phone?.trim()) {
                showError('Numéro manquant', 'Indiquez le numéro qui doit recevoir l\'argent, avec l\'indicatif du pays (ex : +229 ...)');
                return;
            }
            if (!methodDetails.fullName?.trim()) {
                showError('Bénéficiaire manquant', 'Indiquez le nom exact du titulaire du compte mobile money');
                return;
            }
        }
        if (selectedMethod === 'paypal' && !methodDetails.email?.trim()) {
            showError('Email manquant', 'Indiquez l\'adresse email de votre compte PayPal');
            return;
        }
        if (selectedMethod === 'bank_transfer' && !methodDetails.iban?.trim()) {
            showError('IBAN manquant', 'Indiquez l\'IBAN du compte à créditer');
            return;
        }

        setIsActionLoading(true);
        try {
            await payoutApi.updatePaymentMethod({ method: selectedMethod, details: methodDetails });
            showSuccess('Succès', 'Moyen de paiement mis à jour !');
            setShowPaymentModal(false);
            loadData();
        } catch (error: any) {
            showError('Mise à jour impossible', error.response?.data?.error || 'Erreur lors de la mise à jour');
        } finally {
            setIsActionLoading(false);
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'bank_transfer': return 'Virement bancaire';
            case 'paypal': return 'PayPal';
            case 'mobile_money': return 'Mobile Money';
            case 'wave': return 'Wave';
            case 'other': return 'Autre';
            default: return 'Non configuré';
        }
    };

    /**
     * Détails du moyen de paiement, à afficher au guide sur sa propre page.
     * Les clés ont changé au fil du temps (fullName / full_name, phone /
     * phone_number...) : on accepte les deux, sinon d'anciens profils
     * s'afficheraient vides alors que la donnée existe.
     */
    const getMethodDetails = (method: string, details: any): { label: string; valeur: string }[] => {
        const d = (() => {
            if (!details) return {};
            if (typeof details === 'string') {
                try { return JSON.parse(details); } catch { return {}; }
            }
            return details;
        })();

        if (method === 'mobile_money' || method === 'wave') {
            return [
                { label: 'Réseau', valeur: d.network || '' },
                { label: 'Numéro', valeur: d.phone || d.phone_number || '' },
                { label: 'Titulaire du compte', valeur: d.fullName || d.full_name || '' },
            ];
        }
        if (method === 'paypal') {
            return [
                { label: 'Email PayPal', valeur: d.email || d.paypal_email || '' },
                { label: 'Titulaire', valeur: d.name || d.fullName || '' },
            ];
        }
        if (method === 'bank_transfer') {
            return [
                { label: 'IBAN', valeur: d.iban || '' },
                { label: 'BIC', valeur: d.bic || '' },
                { label: 'Titulaire du compte', valeur: d.accountName || d.account_name || '' },
            ];
        }
        return [{ label: 'Informations', valeur: d.info || d.details || '' }];
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'paid': return { label: 'Payé', icon: <CheckCircle2 size={14} />, class: 'paid' };
            case 'pending': return { label: 'En attente', icon: <Clock size={14} />, class: 'pending' };
            case 'in_revision': return { label: 'En révision', icon: <RotateCw size={14} />, class: 'in_revision' };
            case 'refused': return { label: 'Refusé', icon: <AlertTriangle size={14} />, class: 'refused' };
            default: return { label: status, icon: <AlertCircle size={14} />, class: '' };
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Mes gains">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Mes gains">
            <div className="earnings-page">
                {/* Notification Banner */}
                <div className="payout-info-banner">
                    <Calendar size={20} />
                    <div>
                        <p><strong>Information importante :</strong> Les paiements sont désormais effectués <strong>une seule fois par mois</strong>.</p>
                        <p style={{ marginTop: '4px', opacity: 0.9 }}>Vérifiez que votre moyen de paiement est complet (réseau + numéro, ou email PayPal) : un moyen de paiement incomplet est la première cause de paiement non reçu.</p>
                        {stats && Number(stats.balance) > 0 && Number(stats.balance) < 10 && (
                            <p style={{ marginTop: '4px', opacity: 0.8 }}>Si vous lancez un retrait inférieur à 10€ avant d'avoir atteint le seuil, il restera en attente jusqu'au prochain cycle.</p>
                        )}
                    </div>
                </div>

                {/* Balance & Stats Cards */}
                <div className="earnings-stats">
                    <div className="stat-card balance">
                        <div className="stat-icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                            <Wallet size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label">Solde disponible</p>
                            {/* Le solde n'est plus masqué à zéro : un solde négatif signifie
                                que des versements ont dépassé les gains cumulés, et le guide
                                doit pouvoir le constater plutôt que de voir un 0 inexpliqué. */}
                            <h3 className="stat-value">{Number(stats?.balance || 0).toFixed(2)}€</h3>
                            {Number(stats?.balance || 0) < 0 && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                                    Vous avez déjà perçu une avance sur vos gains. Vos prochains
                                    avis validés viendront combler ce montant avant tout nouveau paiement.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="stat-card earnings">
                        <div className="stat-icon-wrapper">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label">Cumul des gains</p>
                            <h3 className="stat-value">{Number(stats?.totalEarned || 0).toFixed(2)}€</h3>
                        </div>
                    </div>

                    <div className="stat-card pending-stats">
                        <div className="stat-icon-wrapper">
                            <Clock size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label">En attente de paiement</p>
                            <h3 className="stat-value">{Number(stats?.totalPending || 0).toFixed(2)}€</h3>
                        </div>
                    </div>

                    {!!stats?.sigPending && (
                        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(109, 40, 217, 0.15)', color: '#6d28d9' }}>
                                <Flag size={24} />
                            </div>
                            <div className="stat-info">
                                <p className="stat-label" style={{ color: '#5b21b6' }}>Signalements en attente</p>
                                <h3 className="stat-value" style={{ color: '#6d28d9' }}>{Number(stats.sigPending).toFixed(2)}€</h3>
                            </div>
                        </div>
                    )}

                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                        <div className="stat-icon-wrapper" style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label" style={{ color: '#065f46' }}>Déjà payé</p>
                            <h3 className="stat-value" style={{ color: '#059669' }}>{Number(stats?.totalPaid || 0).toFixed(2)}€</h3>
                        </div>
                    </div>
                </div>

                {/* Détail des gains : avis + extras + reversements */}
                {bonusDetails && (bonusDetails.totalExtrasAdded !== 0 || bonusDetails.totalReversed !== 0) && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.75rem' }}>Détail de vos gains</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                                <span>Avis validés</span>
                                <span style={{ fontWeight: 600, color: '#059669' }}>+{Number(bonusDetails.totalFromReviews).toFixed(2)} €</span>
                            </div>
                            {bonusDetails.totalExtrasAdded > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                                    <span>Extras (primes, bonus)</span>
                                    <span style={{ fontWeight: 600, color: '#059669' }}>+{Number(bonusDetails.totalExtrasAdded).toFixed(2)} €</span>
                                </div>
                            )}
                            {bonusDetails.totalReversed !== 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#b91c1c', fontWeight: 600 }}>
                                    <span>Extras retirés</span>
                                    <span>{Number(bonusDetails.totalReversed).toFixed(2)} €</span>
                                </div>
                            )}
                        </div>

                        {/* Bloc détail des retraits d'extras */}
                        {bonusDetails.reversals.length > 0 && (
                            <div style={{ marginTop: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.625rem', padding: '0.875rem 1rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertCircle size={14} />
                                    Des extras ont été retirés de votre compte
                                </div>
                                {bonusDetails.reversals.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#b91c1c', paddingTop: i > 0 ? '0.35rem' : 0, borderTop: i > 0 ? '1px solid #fecaca' : 'none', marginTop: i > 0 ? '0.35rem' : 0 }}>
                                        <span>{r.reason}</span>
                                        <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: '1rem' }}>{Number(r.amount).toFixed(2)} €</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Withdraw Action Section */}
                <div className="withdraw-section-container">
                    <div className="withdraw-section">
                        <h3 style={{ margin: 0, fontWeight: 700 }}>Retirer mes gains</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', maxWidth: '400px' }}>
                            Cliquez sur le bouton ci-dessous pour transférer votre solde disponible vers votre compte de paiement enregistré.
                        </p>
                        <button
                            className="withdraw-btn"
                            onClick={handleWithdrawRequest}
                            disabled={isActionLoading || Number(stats?.balance || 0) < 10 || !paymentMethod}
                        >
                            {isActionLoading ? 'Traitement...' : `Retirer ${Math.max(0, Number(stats?.balance || 0)).toFixed(2)}€`}
                        </button>
                        {Number(stats?.balance || 0) < 10 && (
                            <p className="withdraw-amount-tip">
                                <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Solde minimum de 10.00€ requis pour effectuer un retrait.
                            </p>
                        )}
                        {!paymentMethod && (
                            <p className="withdraw-amount-tip" style={{ color: '#ef4444' }}>
                                <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Veuillez configurer un moyen de paiement pour demander un retrait.
                            </p>
                        )}
                    </div>

                    <div className="payment-method-card">
                        <div className="method-info">
                            <CreditCard size={20} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p className="method-label">Moyen de paiement</p>
                                <p className="method-value">{paymentMethod ? getMethodLabel(paymentMethod.method) : 'Non configuré'}</p>

                                {/* Detail des coordonnees : sans cela le guide ne peut pas
                                    verifier ce qui a ete enregistre, alors qu'un numero
                                    errone est la premiere cause de paiement non recu. */}
                                {paymentMethod && (() => {
                                    const lignes = getMethodDetails(paymentMethod.method, paymentMethod.details);
                                    const manquants = lignes.filter(l => !l.valeur.trim());
                                    return (
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {lignes.map(l => (
                                                <div key={l.label} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, minWidth: '120px' }}>
                                                        {l.label}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 700,
                                                        color: l.valeur.trim() ? '#0f172a' : '#b91c1c',
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {l.valeur.trim() || 'Non renseigné'}
                                                    </span>
                                                </div>
                                            ))}

                                            {manquants.length > 0 && (
                                                <p style={{
                                                    margin: '0.35rem 0 0',
                                                    fontSize: '0.78rem',
                                                    lineHeight: 1.4,
                                                    color: '#991b1b',
                                                    background: '#fef2f2',
                                                    border: '1px solid #fecaca',
                                                    borderRadius: '8px',
                                                    padding: '0.5rem 0.625rem'
                                                }}>
                                                    <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                    Informations incomplètes : votre paiement risque d'échouer. Cliquez sur Modifier pour les compléter.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <button className="setup-btn" onClick={() => setShowPaymentModal(true)}>
                            {paymentMethod ? 'Modifier' : 'Ajouter'} <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Payment Method Modal */}
                {showPaymentModal && (
                    <div className="modal-overlay">
                        <div className="modal-content payment-config-modal">
                            <div className="modal-header">
                                <h3>Configurer le paiement</h3>
                                <button className="close-btn" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                {/* Rappel des moyens acceptés : sans réseau ni numéro exact,
                                    le virement mensuel ne peut pas aboutir. */}
                                <div style={{
                                    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                                    padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.85rem',
                                    color: '#1e3a8a', lineHeight: 1.6
                                }}>
                                    <strong>Au Bénin :</strong> MTN MoMo, Moov Money ou Celtiis Cash — précisez toujours
                                    le réseau et le numéro qui reçoit l'argent.<br />
                                    <strong>Hors Bénin / international :</strong> PayPal (email de votre compte) ou
                                    virement bancaire.
                                </div>
                                <div className="method-selector">
                                    <label>Type de paiement</label>
                                    <div className="method-options">
                                        {[
                                            { id: 'bank_transfer', label: 'Virement', icon: <Banknote size={16} /> },
                                            { id: 'paypal', label: 'PayPal', icon: <TrendingUp size={16} /> }, // PayPal doesn't have a specific icon here, using generic
                                            { id: 'mobile_money', label: 'Mobile Money', icon: <Smartphone size={16} /> },
                                            { id: 'wave', label: 'Wave', icon: <Smartphone size={16} /> },
                                            { id: 'other', label: 'Autre', icon: <CreditCard size={16} /> }
                                        ].map(option => (
                                            <div
                                                key={option.id}
                                                className={`method-option-card ${selectedMethod === option.id ? 'active' : ''}`}
                                                onClick={() => setSelectedMethod(option.id)}
                                            >
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedMethod === 'bank_transfer' && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Titulaire du compte</label>
                                            <input type="text" value={methodDetails.accountName || ''} onChange={e => setMethodDetails({ ...methodDetails, accountName: e.target.value })} placeholder="Nom Complet" />
                                        </div>
                                        <div className="form-group">
                                            <label>IBAN *</label>
                                            <input type="text" value={methodDetails.iban || ''} onChange={e => setMethodDetails({ ...methodDetails, iban: e.target.value })} placeholder="FR76 ..." />
                                        </div>
                                        <div className="form-group">
                                            <label>BIC/SWIFT</label>
                                            <input type="text" value={methodDetails.bic || ''} onChange={e => setMethodDetails({ ...methodDetails, bic: e.target.value })} placeholder="BANKFR ..." />
                                        </div>
                                    </div>
                                )}

                                {selectedMethod === 'paypal' && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Email PayPal *</label>
                                            <input type="email" value={methodDetails.email || ''} onChange={e => setMethodDetails({ ...methodDetails, email: e.target.value })} placeholder="votre@email.com" />
                                            <small style={{ color: '#64748b' }}>
                                                L'email exact de votre compte PayPal — c'est la solution la plus simple
                                                pour recevoir un paiement depuis l'étranger.
                                            </small>
                                        </div>
                                    </div>
                                )}

                                {(selectedMethod === 'mobile_money' || selectedMethod === 'wave') && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Réseau / Opérateur *</label>
                                            <input type="text" value={methodDetails.network || ''} onChange={e => setMethodDetails({ ...methodDetails, network: e.target.value })} placeholder="Ex : MTN, Moov, Celtiis, Orange, Wave..." />
                                            <small style={{ color: '#64748b' }}>
                                                Obligatoire. Sans le réseau, nous ne pouvons pas envoyer l'argent.
                                            </small>
                                        </div>
                                        <div className="form-group">
                                            <label>Numéro de téléphone *</label>
                                            <input type="tel" value={methodDetails.phone || ''} onChange={e => setMethodDetails({ ...methodDetails, phone: e.target.value })} placeholder="+229 01 XX XX XX XX" />
                                            <small style={{ color: '#64748b' }}>
                                                Le numéro doit être celui rattaché au compte mobile money, avec l'indicatif du pays.
                                            </small>
                                        </div>
                                        <div className="form-group">
                                            <label>Nom du bénéficiaire *</label>
                                            <input type="text" value={methodDetails.fullName || ''} onChange={e => setMethodDetails({ ...methodDetails, fullName: e.target.value })} placeholder="Nom Complet" />
                                            <small style={{ color: '#64748b' }}>
                                                Exactement le nom enregistré sur le compte mobile money.
                                            </small>
                                        </div>
                                    </div>
                                )}

                                {selectedMethod === 'other' && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Détails du paiement</label>
                                            <textarea value={methodDetails.info || ''} onChange={e => setMethodDetails({ ...methodDetails, info: e.target.value })} placeholder="Décrivez comment vous souhaitez être payé..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Annuler</button>
                                <button className="btn-save" onClick={handleSavePaymentMethod} disabled={isActionLoading}>
                                    {isActionLoading ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vagues de paiement : ce que l'admin a effectivement versé, et la
                    raison quand un virement n'a pas pu aboutir. Masqué tant qu'aucune
                    session fermée ne concerne ce guide. */}
                {paymentSessions.length > 0 && (
                    <div className="submissions-main-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">
                                    <Wallet size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                    Mes paiements
                                </h3>
                                <p className="card-subtitle">
                                    Le détail de chaque vague de paiement vous concernant. En cas d'échec, la raison est indiquée.
                                </p>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Montant dû</th>
                                        <th>Montant reçu</th>
                                        <th>Statut</th>
                                        <th>Détail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentSessions.map(s => {
                                        const styles: Record<string, { bg: string; color: string; texte: string }> = {
                                            pending: { bg: '#fef3c7', color: '#92400e', texte: 'Non traité' },
                                            paid: { bg: '#dcfce7', color: '#166534', texte: 'Payé' },
                                            partial: { bg: '#ede9fe', color: '#6d28d9', texte: 'Partiel' },
                                            failed: { bg: '#fee2e2', color: '#991b1b', texte: 'Non payé' },
                                        };
                                        const st = styles[s.status];
                                        return (
                                            <tr key={s.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>
                                                        {new Date(s.closed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </div>
                                                    {s.label && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{s.label}</div>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{Number(s.amount_due).toFixed(2)}€</td>
                                                <td style={{ fontWeight: 800, color: Number(s.amount_paid) > 0 ? '#059669' : 'var(--gray-400)' }}>
                                                    {Number(s.amount_paid).toFixed(2)}€
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                                        backgroundColor: st.bg, color: st.color, whiteSpace: 'nowrap'
                                                    }}>
                                                        {st.texte}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: 'var(--gray-600)', maxWidth: '300px' }}>
                                                    {s.failure_reason_label ? (
                                                        <>
                                                            <div style={{ fontWeight: 600, color: '#991b1b' }}>{s.failure_reason_label}</div>
                                                            {s.failure_note && (
                                                                <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{s.failure_note}</div>
                                                            )}
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                                                                Le montant reste dû et sera versé au prochain cycle.
                                                            </div>
                                                        </>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* History Table */}
                <div className="submissions-main-card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title"><History size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Historique des retraits</h3>
                            <p className="card-subtitle">Retrouvez toutes vos demandes de paiement ici.</p>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Date de demande</th>
                                    <th>Montant</th>
                                    <th>Statut</th>
                                    <th>Date de paiement</th>
                                    <th className="text-right">Note Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map(payout => {
                                    const statusInfo = getStatusInfo(payout.status);
                                    return (
                                        <tr key={payout.id}>
                                            <td data-label="Date">{new Date(payout.requested_at).toLocaleDateString()}</td>
                                            <td data-label="Montant" className="earnings-amount success">+{Number(payout.amount || 0).toFixed(2)}€</td>
                                            <td data-label="Statut">
                                                <span className={`status-badge ${statusInfo.class}`}>
                                                    {statusInfo.icon} {statusInfo.label}
                                                </span>
                                            </td>
                                            <td data-label="Date paiement">
                                                {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td data-label="Note" className="text-right text-gray-500 italic">
                                                {payout.admin_note || '—'}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center" style={{ padding: '48px' }}>
                                            <div className="empty-state">
                                                <Clock size={48} className="empty-icon" />
                                                <p className="empty-text">Aucun historique de paiement pour le moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
