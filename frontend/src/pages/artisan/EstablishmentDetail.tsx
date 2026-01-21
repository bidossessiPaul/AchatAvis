import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { establishmentService } from '../../services/establishmentService';
import { MapPin, Phone, Globe, Briefcase, Edit, Trash2, ArrowLeft, Building2 } from 'lucide-react';
import Swal from 'sweetalert2';

export const EstablishmentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [establishment, setEstablishment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const data = await establishmentService.getEstablishmentById(id!);
            setEstablishment(data);
            setFormData({
                name: data.name || '',
                address_line1: data.address_line1 || '',
                city: data.city || '',
                postal_code: data.postal_code || '',
                phone: data.phone || '',
                website: data.website || '',
                company_context: data.company_context || ''
            });
        } catch (error: any) {
            console.error('Error loading establishment:', error);
            await Swal.fire('Erreur', 'Impossible de charger cet établissement', 'error');
            navigate('/artisan/establishments');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'Supprimer cet établissement ?',
            html: `<strong>${establishment.name}</strong><br/><small>Cette action est irréversible.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-blue)',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                await establishmentService.deleteEstablishment(id!);
                await Swal.fire('Supprimé !', 'L\'établissement a été supprimé.', 'success');
                navigate('/artisan/establishments');
            } catch (error: any) {
                await Swal.fire('Erreur', error.response?.data?.message || 'Impossible de supprimer cet établissement', 'error');
            }
        }
    };

    const handleSave = async () => {
        try {
            await establishmentService.updateEstablishment(id!, formData);
            await Swal.fire('Succès !', 'Établissement mis à jour.', 'success');
            setIsEditing(false);
            loadData();
        } catch (error: any) {
            await Swal.fire('Erreur', error.response?.data?.message || 'Échec de la mise à jour', 'error');
        }
    };

    if (isLoading) {
        return <DashboardLayout title="Chargement..."><div style={{ padding: '2rem' }}>Chargement...</div></DashboardLayout>;
    }

    if (!establishment) {
        return <DashboardLayout title="Non trouvé"><div style={{ padding: '2rem' }}>Établissement non trouvé</div></DashboardLayout>;
    }

    return (
        <DashboardLayout title={establishment.name}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}
                    >
                        <ArrowLeft size={16} />
                        Retour
                    </button>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    <Edit size={18} />
                                    Modifier
                                </button>
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    <Trash2 size={18} />
                                    Supprimer
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        background: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSave}
                                    style={{
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Enregistrer
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.75rem' }}>
                            <Building2 size={32} color="var(--primary-brand)" />
                        </div>
                        <div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem',
                                        width: '100%'
                                    }}
                                />
                            ) : (
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{establishment.name}</h1>
                            )}
                            <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                                {establishment.sector_name || 'Non spécifié'}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>fiches</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginTop: '0.25rem' }}>
                                {establishment.fiches_count || 0}
                            </div>
                        </div>
                        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Statut</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: establishment.verification_status === 'verified' ? '#10b981' : '#f59e0b', marginTop: '0.25rem' }}>
                                {establishment.verification_status === 'verified' ? 'Vérifié' : establishment.verification_status === 'pending' ? 'En attente' : 'Non vérifié'}
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Informations</h2>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {renderField('Adresse', 'address_line1', MapPin, isEditing, formData, setFormData)}
                            {renderField('Ville', 'city', MapPin, isEditing, formData, setFormData)}
                            {renderField('Code Postal', 'postal_code', MapPin, isEditing, formData, setFormData)}
                            {renderField('Téléphone', 'phone', Phone, isEditing, formData, setFormData)}
                            {renderField('Site web', 'website', Globe, isEditing, formData, setFormData)}
                            {renderField('Contexte', 'company_context', Briefcase, isEditing, formData, setFormData, true)}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const renderField = (label: string, key: string, Icon: any, isEditing: boolean, formData: any, setFormData: any, isTextarea = false) => {
    return (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                <Icon size={18} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div>
                {isEditing ? (
                    isTextarea ? (
                        <textarea
                            value={formData[key] || ''}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            style={{
                                width: '100%',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                fontSize: '0.875rem',
                                minHeight: '80px'
                            }}
                        />
                    ) : (
                        <input
                            type="text"
                            value={formData[key] || ''}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            style={{
                                width: '100%',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                fontSize: '0.875rem'
                            }}
                        />
                    )
                ) : (
                    <div style={{ color: '#111827' }}>{formData[key] || 'Non renseigné'}</div>
                )}
            </div>
        </div>
    );
};
