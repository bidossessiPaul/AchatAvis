import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Link as LinkIcon, Edit, MapPin, Globe, CheckCircle, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { establishmentApi } from '../../services/api';
import api from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import './AddEstablishmentPage.css';

const AddEstablishmentPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [manualData, setManualData] = useState({
        name: '',
        city: '',
        address_line1: '',
        postal_code: '',
        sector_slug: '',
        phone: '',
        website: '',
        company_context: '',
        platform_links: {} as any
    });

    const [sectors, setSectors] = useState<any[]>([]);

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        try {
            const response = await api.get('/anti-detection/sectors');
            const data = response.data.data;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const flattened = [
                    ...(data.easy || []),
                    ...(data.medium || []),
                    ...(data.hard || [])
                ];
                setSectors(flattened);
            } else {
                setSectors(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch sectors', err);
            setSectors([]);
        }
    };

    const handlePlatformSelect = (platform: string) => {
        setSelectedPlatform(platform);
        setStep(2);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await establishmentApi.createManual(manualData);
            setSuccess('Établissement créé avec succès ! Un administrateur va le valider.');
            setTimeout(() => navigate('/artisan/establishments'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Données invalides.');
        } finally {
            setLoading(false);
        }
    };

    const platforms = [
        { id: 'google', name: 'Google Maps', icon: <MapPin size={32} />, color: '#4285F4' },
        { id: 'trustpilot', name: 'Trustpilot', icon: <CheckCircle size={32} />, color: '#00B67A' },
        { id: 'pagesjaunes', name: 'Pages Jaunes', icon: <Search size={32} />, color: '#FFD700' },
        { id: 'other', name: 'Autre / Inconnu', icon: <Globe size={32} />, color: '#6366F1' }
    ];

    return (
        <div className="add-establishment-container">
            <div className="page-header">
                <button className="back-btn" onClick={() => step === 2 ? setStep(1) : navigate(-1)}>
                    <ArrowLeft size={20} />
                    <span>{step === 2 ? 'Changer de plateforme' : 'Retour'}</span>
                </button>
                <h1>Ajouter un établissement</h1>
                <p className="subtitle">
                    {step === 1 ? 'Sur quelle plateforme souhaitez-vous être référencé ?' : 'Complétez les informations de votre entreprise'}
                </p>
            </div>

            <div className="content-container">
                {error && (
                    <div className="alert alert-error">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="alert alert-success">
                        <CheckCircle size={18} />
                        <span>{success}</span>
                    </div>
                )}

                {step === 1 ? (
                    <div className="platforms-grid animate-in">
                        {platforms.map(p => (
                            <button
                                key={p.id}
                                className="platform-card"
                                onClick={() => handlePlatformSelect(p.id)}
                            >
                                <div className="platform-icon" style={{ color: p.color }}>
                                    {p.icon}
                                </div>
                                <h3>{p.name}</h3>
                                <p>Cliquer pour configurer</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <Card className="form-card animate-in">
                        <form onSubmit={handleManualSubmit} className="form-grid">
                            <div className="form-section full-width">
                                <h3>
                                    {platforms.find(p => p.id === selectedPlatform)?.icon}
                                    Informations pour {platforms.find(p => p.id === selectedPlatform)?.name}
                                </h3>
                            </div>

                            <div className="form-group">
                                <label>Nom de l'entreprise *</label>
                                <Input
                                    placeholder="Ex: Ma Super Entreprise"
                                    value={manualData.name}
                                    onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Secteur d'activité *</label>
                                <select
                                    className="custom-select"
                                    value={manualData.sector_slug}
                                    onChange={(e) => setManualData({ ...manualData, sector_slug: e.target.value })}
                                    required
                                >
                                    <option value="">Sélectionnez un secteur</option>
                                    {sectors.map(s => (
                                        <option key={s.id} value={s.sector_slug}>{s.sector_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Ville *</label>
                                <Input
                                    placeholder="Ex: Paris"
                                    value={manualData.city}
                                    onChange={(e) => setManualData({ ...manualData, city: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Code Postal</label>
                                <Input
                                    placeholder="75000"
                                    value={manualData.postal_code}
                                    onChange={(e) => setManualData({ ...manualData, postal_code: e.target.value })}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Adresse Complète</label>
                                <Input
                                    placeholder="12 rue de la Paix"
                                    value={manualData.address_line1}
                                    onChange={(e) => setManualData({ ...manualData, address_line1: e.target.value })}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Contexte de l'entreprise / Description initiale *</label>
                                <textarea
                                    className="custom-textarea"
                                    placeholder="Décrivez votre activité, vos services phares et votre ton habituel. Ce texte servira de base pour vos futures missions."
                                    value={manualData.company_context}
                                    onChange={(e) => setManualData({ ...manualData, company_context: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        minHeight: '120px',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        color: '#1e293b',
                                        fontSize: '0.925rem',
                                        resize: 'vertical'
                                    }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                                    Plus cette description est précise, meilleure sera la génération de vos avis par l'IA.
                                </p>
                            </div>

                            <div className="form-section full-width mt-4">
                                <h3>Lien de la plateforme choisi</h3>
                            </div>

                            {selectedPlatform === 'google' && (
                                <div className="form-group full-width">
                                    <label>Lien Google Maps *</label>
                                    <Input
                                        type="url"
                                        placeholder="https://maps.app.goo.gl/..."
                                        value={manualData.platform_links?.google?.url || ''}
                                        onChange={(e) => setManualData({
                                            ...manualData,
                                            platform_links: {
                                                ...manualData.platform_links,
                                                google: { url: e.target.value, verified: false }
                                            }
                                        })}
                                        required
                                    />
                                </div>
                            )}

                            {selectedPlatform === 'trustpilot' && (
                                <div className="form-group full-width">
                                    <label>Lien Trustpilot *</label>
                                    <Input
                                        type="url"
                                        placeholder="https://fr.trustpilot.com/review/..."
                                        value={manualData.platform_links?.trustpilot?.url || ''}
                                        onChange={(e) => setManualData({
                                            ...manualData,
                                            platform_links: {
                                                ...manualData.platform_links,
                                                trustpilot: { url: e.target.value, verified: false }
                                            }
                                        })}
                                        required
                                    />
                                </div>
                            )}

                            {selectedPlatform === 'pagesjaunes' && (
                                <div className="form-group full-width">
                                    <label>Lien Pages Jaunes *</label>
                                    <Input
                                        type="url"
                                        placeholder="https://www.pagesjaunes.fr/pros/..."
                                        value={manualData.platform_links?.pagesjaunes?.url || ''}
                                        onChange={(e) => setManualData({
                                            ...manualData,
                                            platform_links: {
                                                ...manualData.platform_links,
                                                pagesjaunes: { url: e.target.value, verified: false }
                                            }
                                        })}
                                        required
                                    />
                                </div>
                            )}

                            {selectedPlatform === 'other' && (
                                <div className="form-group full-width">
                                    <label>Lien Plateforme (Autre) *</label>
                                    <Input
                                        type="url"
                                        placeholder="Lien vers votre fiche..."
                                        value={manualData.platform_links?.other?.url || ''}
                                        onChange={(e) => setManualData({
                                            ...manualData,
                                            platform_links: {
                                                ...manualData.platform_links,
                                                other: { url: e.target.value, verified: false }
                                            }
                                        })}
                                        required
                                    />
                                </div>
                            )}

                            <div className="full-width mt-6">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    disabled={loading}
                                >
                                    {loading ? <><Loader2 className="animate-spin mr-2" /> Création...</> : 'Créer mon établissement'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AddEstablishmentPage;
