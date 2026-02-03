import React, { useState } from 'react';
import {
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    TrendingUp,
    Search,
    Edit3,
    ExternalLink,
    Mail,
    Link,
    X
} from 'lucide-react';
import { guideService } from '../../services/guideService';
import { showSuccess, showError } from '../../utils/Swal';
import Swal from 'sweetalert2';
import {
    MdRestaurant, MdPlumbing, MdElectricalServices, MdRealEstateAgent,
    MdHealthAndSafety, MdCarRepair, MdCleaningServices,
    MdOutlineAccountBalanceWallet, MdOutlineLocalFlorist, MdOutlinePets,
    MdOutlineDoorBack, MdOutlinePhotoCamera, MdOutlineHotel, MdOutlineGrass,
    MdRoofing, MdOutlineAcUnit, MdWindow, MdDirectionsCar, MdOutlineConstruction
} from 'react-icons/md';
import { FaHardHat, FaTruckMoving, FaGavel, FaSpa, FaGamepad, FaTooth, FaTaxi, FaTools } from 'react-icons/fa';
import { GiBread, GiScissors, GiLipstick } from 'react-icons/gi';
import { IoCafe } from 'react-icons/io5';
import { HiOutlineComputerDesktop } from 'react-icons/hi2';
import { BiShoppingBag } from 'react-icons/bi';
import { BsBriefcase, BsBrush } from 'react-icons/bs';
import { FiGlobe } from 'react-icons/fi';

const getSectorIcon = (identifier: string) => {
    if (!identifier) return <FiGlobe size={14} />;
    const s = identifier.toLowerCase().trim();

    // Food & Drink
    if (s.includes('restaur')) return <MdRestaurant size={14} />;
    if (s.includes('cafe')) return <IoCafe size={14} />;
    if (s.includes('boulanger')) return <GiBread size={14} />;

    // Services & Beauty
    if (s.includes('coiffure')) return <GiScissors size={14} />;
    if (s.includes('esthetique') || s.includes('beaut') || s.includes('salon')) return <GiLipstick size={14} />;
    if (s.includes('massage') || s.includes('spa') || s.includes('bien-etre')) return <FaSpa size={14} />;
    if (s.includes('nettoy') || s.includes('menage')) return <MdCleaningServices size={14} />;
    if (s.includes('fleurist')) return <MdOutlineLocalFlorist size={14} />;
    if (s.includes('photo')) return <MdOutlinePhotoCamera size={14} />;
    if (s.includes('animaux') || s.includes('pets') || s.includes('animal')) return <MdOutlinePets size={14} />;

    // Home & Building
    if (s.includes('plomb') || s.includes('assainiss')) return <MdPlumbing size={14} />;
    if (s.includes('elec')) return <MdElectricalServices size={14} />;
    if (s.includes('immo')) return <MdRealEstateAgent size={14} />;
    if (s.includes('serrur') || s.includes('depann')) return <MdOutlineDoorBack size={14} />;
    if (s.includes('toiture') || s.includes('couver') || s.includes('couvreur') || s.includes('charpen') || s.includes('ardois')) return <MdRoofing size={14} />;
    if (s.includes('chauff') || s.includes('climo') || s.includes('clim')) return <MdOutlineAcUnit size={14} />;
    if (s.includes('vitr')) return <MdWindow size={14} />;
    if (s.includes('menuis') || s.includes('bois') || s.includes('ebenist')) return <FaTools size={14} />;
    if (s.includes('bati') || s.includes('renov') || s.includes('travaux')) return <FaHardHat size={14} />;
    if (s.includes('macon')) return <MdOutlineConstruction size={14} />;
    if (s.includes('peint') || s.includes('deco')) return <BsBrush size={14} />;
    if (s.includes('jardin') || s.includes('paysag')) return <MdOutlineGrass size={14} />;
    if (s.includes('demenag')) return <FaTruckMoving size={14} />;

    // Tech & Professional
    if (s.includes('info') || s.includes('tech') || s.includes('repar') || s.includes('ordi')) return <HiOutlineComputerDesktop size={14} />;
    if (s.includes('compta') || s.includes('expert') || s.includes('audit')) return <MdOutlineAccountBalanceWallet size={14} />;
    if (s.includes('jurid') || s.includes('avocat') || s.includes('notaire')) return <FaGavel size={14} />;
    if (s.includes('service')) return <BsBriefcase size={14} />;

    // Health & Transport & Others
    if (s.includes('dentist')) return <FaTooth size={14} />;
    if (s.includes('sant') || s.includes('medic') || s.includes('docteur') || s.includes('hopital')) return <MdHealthAndSafety size={14} />;
    if (s.includes('vtc') || s.includes('transport') || s.includes('chauffeur') || s.includes('camion')) return <MdDirectionsCar size={14} />;
    if (s.includes('taxi')) return <FaTaxi size={14} />;
    if (s.includes('hotel') || s.includes('voyage') || s.includes('sejour')) return <MdOutlineHotel size={14} />;
    if (s.includes('auto') || s.includes('garage') || s.includes('mecani')) return <MdCarRepair size={14} />;
    if (s.includes('loysir') || s.includes('loisir') || s.includes('divertis') || s.includes('jeu') || s.includes('sport')) return <FaGamepad size={14} />;
    if (s.includes('shop') || s.includes('commerce') || s.includes('boutique') || s.includes('magasin')) return <BiShoppingBag size={14} />;

    return <FiGlobe size={14} />;
};

interface HistoryItem {
    id: string;
    submitted_at: string;
    status: 'pending' | 'validated' | 'rejected';
    earnings: number;
    artisan_company: string;
    sector_id: number;
    sector_name: string;
    sector_icon: string;
    review_url: string;
    google_email: string;
}

interface GmailHistoryTableProps {
    history: HistoryItem[];
}

export const GmailHistoryTable: React.FC<GmailHistoryTableProps> = ({ history }) => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'validated' | 'pending' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
    const [editForm, setEditForm] = useState({ reviewUrl: '', googleEmail: '' });
    const [isSaving, setIsSaving] = useState(false);

    const filteredHistory = history.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesSearch = item.artisan_company.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const totalEarnings = filteredHistory
        .filter(item => item.status === 'validated')
        .reduce((sum, item) => sum + Number(item.earnings || 0), 0);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'validated':
                return {
                    bg: '#d1fae5',
                    color: '#059669',
                    label: 'Validé',
                    icon: <CheckCircle2 size={12} />
                };
            case 'rejected':
                return {
                    bg: '#fee2e2',
                    color: '#dc2626',
                    label: 'Refusé',
                    icon: <XCircle size={12} />
                };
            default:
                return {
                    bg: '#fef3c7',
                    color: '#d97706',
                    label: 'Attente',
                    icon: <Clock size={12} />
                };
        }
    };

    const handleEdit = (item: HistoryItem) => {
        setEditingItem(item);
        setEditForm({
            reviewUrl: item.review_url || '',
            googleEmail: item.google_email || ''
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        setIsSaving(true);
        Swal.fire({
            title: 'Mise à jour...',
            text: 'Veuillez patienter',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
            await guideService.updateSubmission(editingItem.id, {
                reviewUrl: editForm.reviewUrl,
                googleEmail: editForm.googleEmail
            });

            // Local update
            editingItem.review_url = editForm.reviewUrl;
            editingItem.google_email = editForm.googleEmail;

            setEditingItem(null);
            Swal.close();
            showSuccess('Succès', 'Votre soumission a été mise à jour.');
        } catch (err: any) {
            console.error('Update failed:', err);
            Swal.close();
            showError('Erreur', err.response?.data?.message || 'Impossible de mettre à jour la soumission.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Filters & Stats Header */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Rechercher un artisan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                                outline: 'none',
                                width: '220px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', background: 'white', borderRadius: '0.75rem', padding: '2px', border: '1px solid #e2e8f0' }}>
                        {(['all', 'validated', 'pending', 'rejected'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.6rem',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: statusFilter === status ? 'var(--guide-gradient)' : 'transparent',
                                    color: statusFilter === status ? 'white' : '#64748b',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {status === 'all' ? 'Tous' : getStatusStyles(status).label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Gains filtrés</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{totalEarnings.toFixed(2)}€</div>
                    </div>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#d1fae5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669'
                    }}>
                        <TrendingUp size={20} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contribution</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Secteur</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Statut</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Gain</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                    Aucun résultat correspondant à vos critères.
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.map((item, idx) => {
                                const status = getStatusStyles(item.status);
                                return (
                                    <tr key={item.id} style={{ borderBottom: idx === filteredHistory.length - 1 ? 'none' : '1px solid #f1f5f9', background: 'white' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{item.artisan_company}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {item.id.substring(0, 8)}...</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                                                {getSectorIcon(item.sector_name)}
                                                {item.sector_name || 'Général'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                <Calendar size={14} />
                                                {new Date(item.submitted_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '2rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                background: status.bg,
                                                color: status.color
                                            }}>
                                                {status.icon}
                                                {status.label}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            {Number(item.earnings || 0).toFixed(2)}€
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                                {item.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        style={{
                                                            padding: '0.4rem',
                                                            borderRadius: '0.5rem',
                                                            border: 'none',
                                                            background: '#f1f5f9',
                                                            color: '#64748b',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Modifier"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                )}
                                                {item.review_url && (
                                                    <a
                                                        href={item.review_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            padding: '0.4rem',
                                                            borderRadius: '0.5rem',
                                                            border: 'none',
                                                            background: '#f1f5f9',
                                                            color: '#64748b',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Voir l'avis"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {editingItem && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setEditingItem(null)}
                >
                    <div
                        style={{
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '1.25rem',
                            width: '100%',
                            maxWidth: '500px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Modifier la soumission</h3>
                            <button onClick={() => setEditingItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Link size={14} /> URL de l'avis publié
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={editForm.reviewUrl}
                                    onChange={(e) => setEditForm({ ...editForm, reviewUrl: e.target.value })}
                                    placeholder="https://maps.app.goo.gl/..."
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={14} /> Email Google utilisé
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.googleEmail}
                                    onChange={(e) => setEditForm({ ...editForm, googleEmail: e.target.value })}
                                    placeholder="votre.email@gmail.com"
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#475569',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    style={{
                                        flex: 2,
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        background: 'var(--guide-gradient)',
                                        color: 'white',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        opacity: isSaving ? 0.7 : 1,
                                    }}
                                >
                                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
