import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Search,
    User,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Wallet,
    CheckCircle,
    X,
    DollarSign,
    Download,
    Mail,
    PlayCircle,
    Lock,
    XCircle,
    Clock,
    History,
    AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFileUrl } from '../../utils/url';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface GuideBalance {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    status: string;
    google_email: string;
    phone: string;
    preferred_payout_method: string;
    payout_details: any;
    validated_reviews_count: number;
    earned_from_reviews: number;
    total_bonuses: number;
    total_earned: number;
    total_paid: number;
    total_pending: number;
    oldest_pending_at: string | null;
    balance: number;
}

// Une ligne de session = un guide figé dans la vague de paiement en cours.
interface SessionLine {
    id: string;
    guide_id: string;
    amount_due: number;
    amount_paid: number;
    status: 'pending' | 'paid' | 'partial' | 'failed';
    failure_reason: string | null;
    failure_reason_label: string | null;
    failure_note: string | null;
    guide_name: string | null;
    google_email: string | null;
}

interface PaymentSession {
    id: string;
    label: string | null;
    status: 'open' | 'closed';
    opened_at: string;
    lines: SessionLine[];
}

// Résultat que l'admin enregistre pour un guide donné.
type ResultatPaiement = 'paid' | 'partial' | 'failed';

export const GuidesBalances: React.FC = () => {
    const [guides, setGuides] = useState<GuideBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [balanceSort, setBalanceSort] = useState<'none' | 'asc' | 'desc'>('desc');
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState<GuideBalance | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [amountToPay, setAmountToPay] = useState<string>('');
    const [isPaying, setIsPaying] = useState(false);
    const [isSendingReminders, setIsSendingReminders] = useState(false);

    // --- Session de paiement en cours ---
    const [session, setSession] = useState<PaymentSession | null>(null);
    const [raisonsGroupes, setRaisonsGroupes] = useState<{ titre: string; cles: string[] }[]>([]);
    const [raisonsLabels, setRaisonsLabels] = useState<Record<string, string>>({});
    const [isSessionBusy, setIsSessionBusy] = useState(false);
    // Choix fait dans le modal : payé intégralement, partiel, ou non payé
    const [resultat, setResultat] = useState<ResultatPaiement>('paid');
    const [raisonEchec, setRaisonEchec] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        loadGuides();
        loadSession();
        loadRaisons();
    }, []);

    const loadSession = async () => {
        try {
            setSession(await adminService.getCurrentPaymentSession());
        } catch {
            // Une session absente n'est pas une erreur bloquante : l'écran reste
            // utilisable en paiement direct.
            setSession(null);
        }
    };

    const loadRaisons = async () => {
        try {
            const data = await adminService.getPaiementRaisons();
            setRaisonsGroupes(data.groupes || []);
            setRaisonsLabels(data.raisons || {});
        } catch {
            setRaisonsGroupes([]);
        }
    };

    // Ligne de session correspondant à un guide (undefined si pas de session ouverte)
    const ligneDuGuide = (guideId: string): SessionLine | undefined =>
        session?.lines.find(l => l.guide_id === guideId);

    const handleOpenSession = async () => {
        const aPayer = guides.filter(g => Number(g.total_pending) + Number(g.balance) > 0);
        const total = aPayer.reduce((s, g) => s + Number(g.total_pending) + Number(g.balance), 0);

        const result = await showConfirm(
            'Ouvrir une session de paiement',
            `${aPayer.length} guide${aPayer.length > 1 ? 's' : ''} pour un total de ${total.toFixed(2)}€ seront figés dans cette session.\n\nLes avis validés pendant que tu fais les virements iront dans la session suivante.`
        );
        if (!result.isConfirmed) return;

        setIsSessionBusy(true);
        try {
            const nouvelle = await adminService.openPaymentSession(
                `Paiements du ${new Date().toLocaleDateString('fr-FR')}`
            );
            setSession(nouvelle);
            showSuccess('Session ouverte', `${nouvelle.lines.length} guide(s) à traiter. Renseigne chaque ligne puis ferme la session.`);
        } catch (error: any) {
            showError('Ouverture impossible', error.response?.data?.error || 'Erreur lors de l\'ouverture.');
        } finally {
            setIsSessionBusy(false);
        }
    };

    /**
     * Abandonne la session en cours. Possible tant qu'aucun virement n'a été
     * enregistré ; sinon le backend refuse et invite à fermer pour garder la trace.
     */
    const handleCancelSession = async () => {
        if (!session) return;
        const traites = session.lines.filter(l => l.status !== 'pending').length;

        const result = await showConfirm(
            'Annuler la session',
            traites > 0
                ? `${traites} ligne(s) ont déjà été renseignées. Elles seront perdues et la session disparaîtra de l'historique.\n\nContinuer ?`
                : 'La session sera supprimée et les guides repartiront dans une prochaine vague.\n\nContinuer ?'
        );
        if (!result.isConfirmed) return;

        setIsSessionBusy(true);
        try {
            await adminService.cancelPaymentSession(session.id);
            setSession(null);
            showSuccess('Session annulée', 'Tu peux ouvrir une nouvelle session quand tu veux.');
            loadGuides(true);
        } catch (error: any) {
            showError('Annulation impossible', error.response?.data?.error || 'Erreur lors de l\'annulation.');
        } finally {
            setIsSessionBusy(false);
        }
    };

    const handleCloseSession = async () => {
        if (!session) return;
        const restants = session.lines.filter(l => l.status === 'pending').length;

        const message = restants > 0
            ? `${restants} guide${restants > 1 ? 's n\'ont' : ' n\'a'} pas encore été traité${restants > 1 ? 's' : ''}. Ils seront comptés comme "non traités" dans le récap.\n\nUne session fermée ne peut plus être modifiée.`
            : 'Le récapitulatif sera figé et deviendra visible par les guides concernés.\n\nUne session fermée ne peut plus être modifiée.';

        const result = await showConfirm('Fermer la liste de paiement', message);
        if (!result.isConfirmed) return;

        setIsSessionBusy(true);
        try {
            const fermee = await adminService.closePaymentSession(session.id);
            setSession(null);
            showSuccess(
                'Session fermée',
                `${fermee.stats_paid_count} payé(s), ${fermee.stats_failed_count} en échec — ${Number(fermee.stats_amount_paid).toFixed(2)}€ versés. Le récap est visible par les guides.`
            );
            loadGuides(true);
        } catch (error: any) {
            showError('Fermeture impossible', error.response?.data?.error || 'Erreur lors de la fermeture.');
        } finally {
            setIsSessionBusy(false);
        }
    };

    const loadGuides = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminService.getGuidesBalances();
            setGuides(data);
        } catch (error) {
            showError('Chargement impossible', 'Erreur lors du chargement des soldes');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const openPayModal = (guide: GuideBalance) => {
        setSelectedGuide(guide);
        setAdminNote('');
        setResultat('paid');
        setRaisonEchec('');
        // Pré-remplir avec le solde actuel ; l'admin peut modifier si le paiement
        // réel diffère (ex: entre l'export CSV et le virement, de nouveaux avis
        // ont pu être validés). En session, on reprend le montant figé à
        // l'ouverture pour rester cohérent avec la liste exportée.
        const ligne = ligneDuGuide(guide.id);
        setAmountToPay(
            ligne
                ? Number(ligne.amount_due).toFixed(2)
                : (Number(guide.total_pending) + Number(guide.balance)).toFixed(2)
        );
        setShowPayModal(true);
    };

    /**
     * Enregistre le résultat dans la session ouverte : payé, partiel ou échec.
     * Hors session, le modal conserve son comportement de paiement direct.
     */
    const handleRecordInSession = async () => {
        if (!selectedGuide || !session) return;
        const ligne = ligneDuGuide(selectedGuide.id);
        if (!ligne) {
            showError('Guide absent de la session', 'Ce guide n\'était pas dans la liste figée à l\'ouverture. Il sera traité au prochain cycle.');
            return;
        }

        const amount = Number(amountToPay);

        if (resultat !== 'failed' && (!Number.isFinite(amount) || amount <= 0)) {
            showError('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
            return;
        }
        if (resultat !== 'paid' && !raisonEchec) {
            showError('Raison obligatoire', 'Sélectionne pourquoi le guide n\'a pas été payé intégralement.');
            return;
        }
        if (raisonEchec === 'AUTRE' && !adminNote.trim()) {
            showError('Précision requise', 'Décris la raison dans le champ de note.');
            return;
        }
        if (resultat === 'partial' && amount >= Number(ligne.amount_due)) {
            showError('Montant incohérent', `Un paiement partiel doit être inférieur à ${Number(ligne.amount_due).toFixed(2)}€. Utilise "Payé intégralement" sinon.`);
            return;
        }
        // Un versement inférieur au dû marqué "payé intégralement" faisait
        // disparaître le reliquat : il doit passer en paiement partiel.
        if (resultat === 'paid' && amount < Number(ligne.amount_due) - 0.01) {
            showError(
                'Montant inférieur au dû',
                `Il manque ${(Number(ligne.amount_due) - amount).toFixed(2)}€ sur les ${Number(ligne.amount_due).toFixed(2)}€ dus. ` +
                'Choisis "Paiement partiel" et indique la raison — le reliquat restera dû au guide.'
            );
            return;
        }

        const recap = resultat === 'failed'
            ? `Marquer ${selectedGuide.full_name || selectedGuide.google_email} comme NON PAYÉ ?\n\nRaison : ${raisonsLabels[raisonEchec] || raisonEchec}\n\nLe guide verra cette raison dans son espace une fois la session fermée.`
            : resultat === 'partial'
                ? `Enregistrer un paiement partiel de ${amount.toFixed(2)}€ sur ${Number(ligne.amount_due).toFixed(2)}€ dus ?\n\nRaison du reliquat : ${raisonsLabels[raisonEchec] || raisonEchec}`
                : `Enregistrer un paiement de ${amount.toFixed(2)}€ à ${selectedGuide.full_name || selectedGuide.google_email} ?`;

        // Ferme le modal avant Swal — le backdrop-filter crée un plan de
        // composition GPU qui masque SweetAlert2 même avec un z-index plus élevé.
        setShowPayModal(false);
        const confirm = await showConfirm('Confirmer', recap);
        if (!confirm.isConfirmed) {
            setShowPayModal(true);
            return;
        }

        setIsPaying(true);
        try {
            const maj = await adminService.recordPaymentLine(session.id, ligne.id, {
                status: resultat,
                amountPaid: resultat === 'failed' ? 0 : amount,
                failureReason: resultat === 'paid' ? undefined : raisonEchec,
                failureNote: adminNote.trim() || undefined,
            });
            setSession(maj);
            showSuccess(
                resultat === 'failed' ? 'Échec enregistré' : 'Paiement enregistré',
                resultat === 'failed'
                    ? 'Le guide a été notifié. La raison apparaîtra dans son historique à la fermeture de la session.'
                    : `${amount.toFixed(2)}€ enregistrés.`
            );
            setSelectedGuide(null);
            loadGuides(true);
        } catch (error: any) {
            showError('Enregistrement impossible', error.response?.data?.error || 'Erreur lors de l\'enregistrement.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleForcePay = async () => {
        if (!selectedGuide) return;

        const amount = Number(amountToPay);
        if (!Number.isFinite(amount) || amount <= 0) {
            showError('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
            return;
        }

        const net = Number(selectedGuide.total_pending) + Number(selectedGuide.balance);
        const remaining = net - amount;
        const isAdvance = remaining < -0.01;

        const confirmMessage = isAdvance
            ? `Enregistrer une avance de ${amount.toFixed(2)}€ à ${selectedGuide.full_name || selectedGuide.google_email} ?\n\nLe guide recevra ${(amount - net).toFixed(2)}€ de plus que son net dû (${net.toFixed(2)}€). Les prochains avis validés rembourseront automatiquement cette avance.`
            : `Enregistrer un paiement de ${amount.toFixed(2)}€ à ${selectedGuide.full_name || selectedGuide.google_email} ?\n\nNet restant après paiement : ${remaining.toFixed(2)}€`;

        // Ferme le premier modal avant Swal — le backdrop-filter crée un plan de
        // composition GPU qui masque SweetAlert2 même avec un z-index plus élevé.
        setShowPayModal(false);
        const result = await showConfirm('Confirmer le paiement', confirmMessage);
        if (!result.isConfirmed) {
            setShowPayModal(true);
            return;
        }

        setIsPaying(true);
        try {
            await adminService.forcePayGuide(
                selectedGuide.id,
                amount,
                adminNote || undefined
            );
            showSuccess(
                'Paiement enregistré',
                `${amount.toFixed(2)}€ payé. Net restant : ${remaining.toFixed(2)}€. Le guide verra ce paiement dans son historique.`
            );
            setShowPayModal(false);
            setSelectedGuide(null);
            loadGuides(true);
        } catch (error: any) {
            showError('Paiement impossible', error.response?.data?.error || 'Erreur lors du paiement');
        } finally {
            setIsPaying(false);
        }
    };

    const filteredGuides = guides.filter(g =>
        (Number(g.total_pending) + Number(g.balance)) > 0 &&
        (
            g.google_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.phone?.includes(searchTerm)
        )
    );

    const sortedGuides = (() => {
        // Guides avec demande de retrait en attente toujours en tête
        const withPending = filteredGuides.filter(g => Number(g.total_pending) > 0);
        const withoutPending = filteredGuides.filter(g => Number(g.total_pending) === 0);
        const sortFn = (a: GuideBalance, b: GuideBalance) =>
            balanceSort === 'asc'
                ? Number(a.balance) - Number(b.balance)
                : Number(b.balance) - Number(a.balance);
        if (balanceSort === 'none') return [...withPending, ...withoutPending];
        return [...withPending.sort(sortFn), ...withoutPending.sort(sortFn)];
    })();

    const totalPages = Math.ceil(sortedGuides.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedGuides = sortedGuides.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const exportCSV = () => {
        const dataToExport = sortedGuides;
        const headers = [
            'Nom guide', 'Email', 'Téléphone',
            'Moyen de paiement', 'Nom bénéficiaire', 'IBAN / Numéro / Email paiement', 'BIC / Réseau',
            'Avis validés', 'Gains avis (€)', 'Extras (€)', 'Total gagné (€)',
            'Déjà versé (€)', 'Solde disponible (€)', 'Net à payer (€)',
        ];

        const escapeCSV = (value: string) => {
            // Préfixe les valeurs commençant par =+-@\t\r pour neutraliser l'injection de formule Excel
            const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
            if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
                return `"${safe.replace(/"/g, '""')}"`;
            }
            return safe;
        };

        const methodLabel = (method: string) => {
            if (method === 'bank_transfer') return 'Virement bancaire';
            if (method === 'paypal') return 'PayPal';
            if (method === 'mobile_money') return 'Mobile Money';
            if (method === 'wave') return 'Wave';
            return method || '';
        };

        const parseDetails = (guide: GuideBalance) => {
            const d = (() => {
                if (!guide.payout_details) return {};
                if (typeof guide.payout_details === 'string') {
                    try { return JSON.parse(guide.payout_details); } catch { return {}; }
                }
                return guide.payout_details;
            })();
            const m = guide.preferred_payout_method;
            if (m === 'bank_transfer') return { name: d.accountName || d.account_name || '', ref: d.iban || '', extra: d.bic || '' };
            if (m === 'paypal') return { name: d.name || '', ref: d.email || d.paypal_email || '', extra: '' };
            if (m === 'mobile_money' || m === 'wave') return { name: d.fullName || d.full_name || '', ref: d.phone || d.phone_number || '', extra: d.network || '' };
            return { name: '', ref: d.info || '', extra: '' };
        };

        const rows = dataToExport.map(guide => {
            const { name, ref, extra } = parseDetails(guide);
            return [
                escapeCSV(guide.full_name || ''),
                escapeCSV(guide.google_email || guide.email || ''),
                escapeCSV(guide.phone || ''),
                escapeCSV(methodLabel(guide.preferred_payout_method)),
                escapeCSV(name),
                escapeCSV(ref),
                escapeCSV(extra),
                String(guide.validated_reviews_count),
                Number(guide.earned_from_reviews).toFixed(2),
                Number(guide.total_bonuses).toFixed(2),
                Number(guide.total_earned).toFixed(2),
                Number(guide.total_paid).toFixed(2),
                Number(guide.balance).toFixed(2),
                (Number(guide.total_pending) + Number(guide.balance)).toFixed(2),
            ].join(',');
        });

        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `soldes-guides-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const sendPaymentReminders = async () => {
        const eligible = guides.filter(g => Number(g.balance) > 0).length;
        const confirm = await showConfirm(
            'Envoyer les rappels',
            `Un email sera envoyé à ${eligible} guide${eligible > 1 ? 's' : ''} avec un solde > 0€ pour leur demander de vérifier leur moyen de paiement.`
        );
        if (!confirm.isConfirmed) return;
        setIsSendingReminders(true);
        try {
            const result = await adminService.sendPaymentMethodReminders();
            showSuccess('Emails envoyés', `${result.sent} email${result.sent > 1 ? 's' : ''} envoyé${result.sent > 1 ? 's' : ''} avec succès.`);
        } catch {
            showError('Envoi impossible', 'Impossible d\'envoyer les rappels.');
        } finally {
            setIsSendingReminders(false);
        }
    };

    // Stats
    // Ce que la plateforme doit réellement : uniquement les soldes créditeurs.
    // Y soustraire les soldes négatifs (guides sur-payés) donnerait un total qui
    // ne correspond à aucune somme à verser.
    const totalBalance = guides.reduce((sum, g) => sum + Math.max(0, Number(g.balance)), 0);
    // Sur-paiements cumulés, suivis à part car ils ne s'effacent pas d'eux-mêmes :
    // ils se résorbent au fil des prochains avis validés de ces guides.
    const totalOverpaid = guides.reduce((sum, g) => sum + Math.min(0, Number(g.balance)), 0);
    const guidesOverpaid = guides.filter(g => Number(g.balance) < 0).length;
    const totalEarned = guides.reduce((sum, g) => sum + Number(g.total_earned), 0);
    const totalPaid = guides.reduce((sum, g) => sum + Number(g.total_paid), 0);
    const totalBonuses = guides.reduce((sum, g) => sum + Number(g.total_bonuses), 0);
    const totalPending = guides.reduce((sum, g) => sum + Number(g.total_pending), 0);
    const guidesWithPending = guides.filter(g => Number(g.total_pending) > 0).length;
    const guidesWithBalance = guides.filter(g => Number(g.balance) > 0).length;
    const totalValidatedReviews = guides.reduce((sum, g) => sum + Number(g.validated_reviews_count), 0);

    return (
        <DashboardLayout title="Soldes des Guides">
            <div className="admin-dashboard revamped">
                {/* Bandeau de session de paiement : ouvrir une vague, suivre son
                    avancement, la fermer. Hors session, le bouton Payer reste en
                    paiement direct comme avant. */}
                {(() => {
                    const lignes = session?.lines || [];
                    const payes = lignes.filter(l => l.status === 'paid' || l.status === 'partial').length;
                    const echecs = lignes.filter(l => l.status === 'failed').length;
                    const restants = lignes.filter(l => l.status === 'pending').length;
                    const verse = lignes.reduce((s, l) => s + Number(l.amount_paid), 0);
                    const du = lignes.reduce((s, l) => s + Number(l.amount_due), 0);

                    return (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem',
                            borderRadius: '1rem',
                            border: session ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                            background: session ? '#ecfdf5' : 'white',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '0.75rem', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                    background: session
                                        ? 'linear-gradient(135deg, #059669, #047857)'
                                        : 'linear-gradient(135deg, #64748b, #475569)'
                                }}>
                                    {session ? <Clock size={20} /> : <PlayCircle size={20} />}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--gray-900)' }}>
                                        {session ? (session.label || 'Session de paiement en cours') : 'Aucune session de paiement ouverte'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                                        {session
                                            ? `${payes} payé${payes > 1 ? 's' : ''} · ${echecs} en échec · ${restants} à traiter — ${verse.toFixed(2)}€ / ${du.toFixed(2)}€`
                                            : 'Ouvre une session pour figer la liste des guides à payer et tracer chaque virement.'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => navigate('/admin/sessions-paiement')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '0.5rem 1rem', borderRadius: '8px',
                                        border: '1px solid var(--gray-300)', background: 'white',
                                        fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-700)', cursor: 'pointer'
                                    }}
                                >
                                    <History size={16} />
                                    Historique
                                </button>
                                {session ? (
                                    <>
                                        <button
                                            onClick={handleCancelSession}
                                            disabled={isSessionBusy}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '0.5rem 1rem', borderRadius: '8px',
                                                border: '1px solid #fecaca', background: '#fef2f2',
                                                color: '#991b1b', fontWeight: 700, fontSize: '0.85rem',
                                                cursor: isSessionBusy ? 'not-allowed' : 'pointer',
                                                opacity: isSessionBusy ? 0.5 : 1
                                            }}
                                        >
                                            <XCircle size={16} />
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleCloseSession}
                                            disabled={isSessionBusy}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                                background: 'linear-gradient(135deg, #d97706, #b45309)',
                                                color: 'white', fontWeight: 700, fontSize: '0.85rem',
                                                cursor: isSessionBusy ? 'not-allowed' : 'pointer',
                                                opacity: isSessionBusy ? 0.5 : 1
                                            }}
                                        >
                                            <Lock size={16} />
                                            {isSessionBusy ? 'Fermeture...' : 'Fermer la liste'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleOpenSession}
                                        disabled={isSessionBusy || isLoading || sortedGuides.length === 0}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                            background: 'linear-gradient(135deg, #059669, #047857)',
                                            color: 'white', fontWeight: 700, fontSize: '0.85rem',
                                            cursor: isSessionBusy || sortedGuides.length === 0 ? 'not-allowed' : 'pointer',
                                            opacity: isSessionBusy || sortedGuides.length === 0 ? 0.5 : 1
                                        }}
                                    >
                                        <PlayCircle size={16} />
                                        {isSessionBusy ? 'Ouverture...' : 'Ouvrir un paiement'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{guidesWithBalance}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Guides avec solde &gt; 0</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #475569, #334155)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalEarned.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Total gagné (validé)</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalPaid.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Versé réel</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalBonuses.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Extras versés</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalBalance.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Solde disponible total</div>
                        {guidesOverpaid > 0 && (
                            <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '4px' }}>
                                Hors {totalOverpaid.toFixed(2)}€ d'avances sur {guidesOverpaid} guide{guidesOverpaid > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #d97706, #b45309)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalPending.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>En attente retrait ({guidesWithPending} guides)</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalValidatedReviews}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Avis validés total</div>
                    </div>
                </div>

                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Soldes des Guides</h2>
                        <div className="admin-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, email ou téléphone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={sendPaymentReminders}
                                disabled={isLoading || isSendingReminders || guidesWithBalance === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: isLoading || isSendingReminders || guidesWithBalance === 0 ? 'not-allowed' : 'pointer',
                                    opacity: isLoading || isSendingReminders || guidesWithBalance === 0 ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Mail size={16} />
                                {isSendingReminders ? 'Envoi...' : `Rappel paiement (${guidesWithBalance})`}
                            </button>
                            <button
                                onClick={exportCSV}
                                disabled={isLoading || sortedGuides.length === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: isLoading || sortedGuides.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: isLoading || sortedGuides.length === 0 ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Download size={16} />
                                Exporter CSV
                            </button>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des soldes..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Guide</th>
                                        <th>Avis validés</th>
                                        <th>Gains avis</th>
                                        <th>Extras</th>
                                        <th>Total gagné</th>
                                        <th>Déjà versé</th>
                                        <th
                                            onClick={() => setBalanceSort(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Solde disponible
                                                {balanceSort === 'none' && <ArrowUpDown size={14} style={{ opacity: 0.4 }} />}
                                                {balanceSort === 'desc' && <ArrowDown size={14} style={{ color: '#059669' }} />}
                                                {balanceSort === 'asc' && <ArrowUp size={14} style={{ color: '#059669' }} />}
                                            </div>
                                        </th>
                                        <th>Net à payer</th>
                                        {session && <th>Statut session</th>}
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedGuides.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                                                Aucun guide avec des avis validés trouvé
                                            </td>
                                        </tr>
                                    ) : paginatedGuides.map(guide => (
                                        <tr key={guide.id}>
                                            <td className="font-medium">
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/admin/guides/${guide.id}`)}
                                                >
                                                    {guide.avatar_url ? (
                                                        <img src={getFileUrl(guide.avatar_url)} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#0369a1', textDecoration: 'underline' }}>{guide.google_email}</div>
                                                        {guide.full_name && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{guide.full_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Avis validés */}
                                            <td>
                                                <span style={{ padding: '0.3rem 0.7rem', backgroundColor: '#f0f9ff', borderRadius: '8px', fontWeight: 700, color: '#0369a1', fontSize: '0.9rem' }}>
                                                    {guide.validated_reviews_count}
                                                </span>
                                            </td>
                                            {/* Gains avis uniquement */}
                                            <td style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                                                {Number(guide.earned_from_reviews).toFixed(2)}€
                                            </td>
                                            {/* Extras : primes, bonuses admin */}
                                            <td>
                                                {Number(guide.total_bonuses) > 0 ? (
                                                    <span style={{ padding: '0.25rem 0.6rem', background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                                                        +{Number(guide.total_bonuses).toFixed(2)}€
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>—</span>
                                                )}
                                            </td>
                                            {/* Total gagné = avis + extras */}
                                            <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                                {Number(guide.total_earned).toFixed(2)}€
                                            </td>
                                            {/* Déjà versé : payouts status='paid' uniquement */}
                                            <td>
                                                {Number(guide.total_paid) > 0
                                                    ? <span style={{ color: '#059669', fontWeight: 600 }}>{Number(guide.total_paid).toFixed(2)}€</span>
                                                    : <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>—</span>
                                                }
                                            </td>
                                            {/* Solde disponible + indicateur retrait en attente */}
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: 'fit-content' }}>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '0.4rem 0.8rem',
                                                        backgroundColor: Number(guide.balance) > 0 ? '#ecfdf5' : Number(guide.balance) < 0 ? '#fef2f2' : 'var(--gray-50)',
                                                        borderRadius: '10px',
                                                    }}>
                                                        <Wallet size={14} style={{ color: Number(guide.balance) > 0 ? '#059669' : Number(guide.balance) < 0 ? '#dc2626' : 'var(--gray-400)' }} />
                                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: Number(guide.balance) > 0 ? '#059669' : Number(guide.balance) < 0 ? '#dc2626' : 'var(--gray-400)' }}>
                                                            {Number(guide.balance).toFixed(2)}€
                                                        </span>
                                                    </div>
                                                    {Number(guide.total_pending) > 0 && guide.oldest_pending_at && (() => {
                                                        const days = Math.floor((Date.now() - new Date(guide.oldest_pending_at).getTime()) / 86400000);
                                                        return (
                                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: days >= 7 ? '#dc2626' : '#92400e', paddingLeft: '2px' }}>
                                                                {days >= 7 ? `⚠ retrait ${days}j` : `retrait ${days}j`} — {Number(guide.total_pending).toFixed(2)}€
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            {/* Net à payer = pending + solde libre */}
                                            <td>
                                                {(() => {
                                                    const net = Number(guide.total_pending) + Number(guide.balance);
                                                    if (net <= 0) return <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>—</span>;
                                                    return (
                                                        <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#ede9fe', borderRadius: '10px', width: 'fit-content', fontWeight: 800, fontSize: '1rem', color: '#7c3aed' }}>
                                                            {net.toFixed(2)}€
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            {/* Statut du guide dans la session en cours */}
                                            {session && (
                                                <td>
                                                    {(() => {
                                                        const ligne = ligneDuGuide(guide.id);
                                                        if (!ligne) {
                                                            return (
                                                                <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                                                                    Hors session
                                                                </span>
                                                            );
                                                        }
                                                        const styles: Record<string, { bg: string; color: string; texte: string }> = {
                                                            pending: { bg: '#fef3c7', color: '#92400e', texte: 'À traiter' },
                                                            paid: { bg: '#dcfce7', color: '#166534', texte: 'Payé' },
                                                            partial: { bg: '#ede9fe', color: '#6d28d9', texte: 'Partiel' },
                                                            failed: { bg: '#fee2e2', color: '#991b1b', texte: 'Non payé' },
                                                        };
                                                        const s = styles[ligne.status];
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                                                <span style={{
                                                                    padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                                                    backgroundColor: s.bg, color: s.color
                                                                }}>
                                                                    {s.texte}
                                                                </span>
                                                                {ligne.failure_reason_label && (
                                                                    <span style={{ fontSize: '0.68rem', color: 'var(--gray-500)', maxWidth: '160px', lineHeight: 1.3 }}>
                                                                        {ligne.failure_reason_label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                            )}
                                            <td className="actions-cell">
                                                {(() => {
                                                    // En session, une ligne déjà payée n'est plus rejouable :
                                                    // l'argent a bougé, un second enregistrement doublerait le versement.
                                                    const ligne = session ? ligneDuGuide(guide.id) : undefined;
                                                    if (ligne && (ligne.status === 'paid' || ligne.status === 'partial')) {
                                                        return (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontSize: '0.8rem', fontWeight: 700 }}>
                                                                <CheckCircle size={14} />
                                                                {Number(ligne.amount_paid).toFixed(2)}€ versés
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                {(() => {
                                                    const ligne = session ? ligneDuGuide(guide.id) : undefined;
                                                    if (ligne && (ligne.status === 'paid' || ligne.status === 'partial')) return null;
                                                    return (Number(guide.total_pending) + Number(guide.balance)) > 0 ? (
                                                    <button
                                                        onClick={() => openPayModal(guide)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '0.5rem 1rem',
                                                            background: ligne?.status === 'failed'
                                                                ? 'linear-gradient(135deg, #d97706, #b45309)'
                                                                : 'linear-gradient(135deg, #059669, #047857)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <DollarSign size={14} />
                                                        {ligne?.status === 'failed' ? 'Corriger' : 'Payer'}
                                                    </button>
                                                ) : (
                                                    <span style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: 'var(--gray-400)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600
                                                    }}>
                                                        <CheckCircle size={14} />
                                                        Soldé
                                                    </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!isLoading && sortedGuides.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                    <option value={20}>20 guides</option>
                                    <option value={50}>50 guides</option>
                                    <option value={100}>100 guides</option>
                                    <option value={200}>200 guides</option>
                                </select>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedGuides.length)} sur {sortedGuides.length}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white', color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}><ChevronLeft size={16} />Précédent</button>
                                <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white', color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}>Suivant<ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pay Modal */}
            {showPayModal && selectedGuide && (
                <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <DollarSign size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Enregistrer un paiement</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Saisis le montant réellement versé — le solde sera recalculé</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="modal-close">
                                <X size={20} color="var(--gray-400)" />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {/* Guide info — compact row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'var(--gray-50)',
                                    borderRadius: '10px'
                                }}>
                                    {selectedGuide.avatar_url ? (
                                        <img src={getFileUrl(selectedGuide.avatar_url)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <User size={18} color="var(--gray-500)" />
                                        </div>
                                    )}
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedGuide.full_name || selectedGuide.google_email}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedGuide.validated_reviews_count} avis · {Number(selectedGuide.total_earned).toFixed(2)}€ gagnés
                                        </div>
                                    </div>
                                </div>

                                {/* Soldes côte à côte — compacts */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div style={{
                                        background: '#f0f9ff',
                                        borderRadius: '8px',
                                        padding: '0.625rem',
                                        border: '1px solid #bae6fd',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.65rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Solde actuel</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0c4a6e', marginTop: '2px' }}>
                                            {Number(selectedGuide.balance).toFixed(2)}€
                                        </div>
                                    </div>
                                    {(() => {
                                        const amt = Number(amountToPay);
                                        const remaining = Number(selectedGuide.balance) - (Number.isFinite(amt) ? amt : 0);
                                        const isSoldé = Math.abs(remaining) < 0.01;
                                        const isAdvance = remaining < -0.01;
                                        const bg = isAdvance ? '#fef2f2' : isSoldé ? '#ecfdf5' : '#fffbeb';
                                        const border = isAdvance ? '1px solid #fecaca' : isSoldé ? '1px solid #a7f3d0' : '1px solid #fde68a';
                                        const labelColor = isAdvance ? '#b91c1c' : isSoldé ? '#047857' : '#b45309';
                                        const valueColor = isAdvance ? '#7f1d1d' : isSoldé ? '#065f46' : '#78350f';
                                        const labelText = isAdvance ? 'Avance — solde négatif' : 'Nouveau solde';
                                        return (
                                            <div style={{
                                                background: bg,
                                                borderRadius: '8px',
                                                padding: '0.625rem',
                                                border,
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.65rem', color: labelColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                    {labelText}
                                                </div>
                                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: valueColor, marginTop: '2px' }}>
                                                    {remaining.toFixed(2)}€
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Résultat du virement — visible uniquement pendant une session.
                                    Hors session, le modal reste un paiement direct simple. */}
                                {session && ligneDuGuide(selectedGuide.id) && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
                                            Résultat du virement *
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                                            {([
                                                { cle: 'paid' as const, texte: 'Payé', couleur: '#059669', bg: '#ecfdf5', bordure: '#a7f3d0', Icone: CheckCircle },
                                                { cle: 'partial' as const, texte: 'Partiel', couleur: '#6d28d9', bg: '#ede9fe', bordure: '#ddd6fe', Icone: AlertTriangle },
                                                { cle: 'failed' as const, texte: 'Non payé', couleur: '#b91c1c', bg: '#fef2f2', bordure: '#fecaca', Icone: XCircle },
                                            ]).map(({ cle, texte, couleur, bg, bordure, Icone }) => {
                                                const actif = resultat === cle;
                                                return (
                                                    <button
                                                        key={cle}
                                                        type="button"
                                                        onClick={() => {
                                                            setResultat(cle);
                                                            // Un paiement intégral n'a pas de raison à renseigner
                                                            if (cle === 'paid') setRaisonEchec('');
                                                            // Pré-remplit la raison la plus courante du cas partiel
                                                            if (cle === 'partial' && !raisonEchec) setRaisonEchec('PAIEMENT_PARTIEL');
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                                            padding: '0.6rem 0.4rem', borderRadius: '8px',
                                                            border: actif ? `2px solid ${couleur}` : '1px solid var(--gray-300)',
                                                            background: actif ? bg : 'white',
                                                            color: actif ? couleur : 'var(--gray-600)',
                                                            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                                                            boxShadow: actif ? `0 0 0 1px ${bordure}` : 'none'
                                                        }}
                                                    >
                                                        <Icone size={15} />
                                                        {texte}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Raison de l'échec ou du reliquat — obligatoire hors paiement intégral */}
                                {session && ligneDuGuide(selectedGuide.id) && resultat !== 'paid' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
                                            {resultat === 'failed' ? 'Pourquoi le guide n\'a pas été payé *' : 'Pourquoi le montant est incomplet *'}
                                        </label>
                                        <select
                                            value={raisonEchec}
                                            onChange={(e) => setRaisonEchec(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.65rem 0.85rem',
                                                borderRadius: '8px',
                                                border: raisonEchec ? '2px solid #059669' : '2px solid #dc2626',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                fontFamily: 'inherit',
                                                backgroundColor: 'white',
                                                boxSizing: 'border-box',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">— Sélectionne une raison —</option>
                                            {raisonsGroupes.map(groupe => (
                                                <optgroup key={groupe.titre} label={groupe.titre}>
                                                    {groupe.cles.map(cle => (
                                                        <option key={cle} value={cle}>{raisonsLabels[cle] || cle}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '0.4rem', lineHeight: 1.35 }}>
                                            Cette raison sera visible par le guide dans son espace une fois la session fermée.
                                        </p>
                                    </div>
                                )}

                                {/* Montant payé (éditable) */}
                                <div style={{ display: session && ligneDuGuide(selectedGuide.id) && resultat === 'failed' ? 'none' : 'block' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            Montant réellement payé *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setAmountToPay(Number(selectedGuide.balance).toFixed(2))}
                                            style={{
                                                padding: '0.2rem 0.55rem',
                                                borderRadius: '6px',
                                                border: '1px solid #e5e7eb',
                                                background: 'white',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: '#059669',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Tout le solde
                                        </button>
                                    </div>
                                    {(() => {
                                        const amt = Number(amountToPay);
                                        const isAdvance = Number.isFinite(amt) && amt > Number(selectedGuide.balance);
                                        return (
                                            <>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={amountToPay}
                                                        onChange={(e) => setAmountToPay(e.target.value)}
                                                        placeholder="0.00"
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                                                            borderRadius: '8px',
                                                            border: '2px solid #059669',
                                                            fontSize: '1.2rem',
                                                            fontWeight: 800,
                                                            color: '#059669',
                                                            outline: 'none',
                                                            fontFamily: 'inherit',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                    <span style={{
                                                        position: 'absolute',
                                                        right: '0.85rem',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        fontSize: '1rem',
                                                        fontWeight: 700,
                                                        color: '#059669',
                                                        pointerEvents: 'none'
                                                    }}>€</span>
                                                </div>
                                                {isAdvance ? (
                                                    <p style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '0.4rem', lineHeight: 1.35, background: '#fffbeb', padding: '0.5rem 0.625rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                                        ⚠ Avance : le solde du guide passera en négatif. Les prochains avis validés rembourseront automatiquement la dette.
                                                    </p>
                                                ) : (
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '0.4rem', lineHeight: 1.35 }}>
                                                        Si de nouveaux avis ont été validés depuis l'export, le reste non payé sera conservé pour le prochain cycle.
                                                    </p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Admin note */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
                                        Note (optionnel)
                                    </label>
                                    <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        placeholder="Ex: Virement bancaire du 21/04..."
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--gray-300)',
                                            fontSize: '0.85rem',
                                            minHeight: '56px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="btn-secondary"
                                style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                            >
                                Annuler
                            </button>
                            {(() => {
                                const enSession = !!(session && ligneDuGuide(selectedGuide.id));
                                const amt = Number(amountToPay);
                                const montantInvalide = !amountToPay || !Number.isFinite(amt) || amt <= 0;
                                // En échec le montant est ignoré ; en revanche la raison devient obligatoire.
                                const isInvalid = enSession
                                    ? (resultat === 'failed' ? !raisonEchec : montantInvalide || (resultat === 'partial' && !raisonEchec))
                                    : montantInvalide;

                                const libelle = !enSession
                                    ? `Confirmer ${(Number(amountToPay) || 0).toFixed(2)}€`
                                    : resultat === 'failed'
                                        ? 'Enregistrer le non-paiement'
                                        : `Confirmer ${(Number(amountToPay) || 0).toFixed(2)}€`;

                                return (
                                    <button
                                        onClick={enSession ? handleRecordInSession : handleForcePay}
                                        className="admin-btn-primary"
                                        style={{
                                            background: enSession && resultat === 'failed'
                                                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                                                : 'linear-gradient(135deg, #059669, #047857)',
                                            padding: '0.6rem 1.25rem',
                                            fontSize: '0.875rem',
                                            justifyContent: 'center',
                                            opacity: isInvalid ? 0.5 : 1,
                                            cursor: isInvalid ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={isPaying || isInvalid}
                                    >
                                        {isPaying ? 'Enregistrement...' : libelle}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
