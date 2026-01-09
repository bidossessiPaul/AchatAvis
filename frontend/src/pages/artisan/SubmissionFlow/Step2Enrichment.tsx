import React, { useState } from 'react';
import { ReviewOrder } from '../../../types';
import { SectorSelect } from '../../../components/Campaign/SectorSelect';
import { RhythmeSlider, RhythmeConfig } from '../../../components/Campaign/RhythmeSlider';
import { LocalisationClients } from '../../../components/Campaign/LocalisationClients';
import { showError } from '../../../utils/Swal';
import { CheckCircle } from 'lucide-react';

interface Step2Props {
    initialData: Partial<ReviewOrder> | null;
    onNext: (data: Partial<ReviewOrder>) => void;
    onBack: () => void;
}

export const Step2Enrichment: React.FC<Step2Props> = ({ initialData, onNext, onBack }) => {
    // New Anti-Detection State
    const [formData, setFormData] = useState({
        sector: initialData?.sector || '',
        sector_id: initialData?.sector_id || null,
        sector_slug: initialData?.sector_slug || '',
        sector_difficulty: initialData?.sector_difficulty || 'easy',

        zones: initialData?.zones || '',
        city: initialData?.city || '',

        positioning: initialData?.positioning || '',
        // ... (lines 26-37)
        client_types: initialData?.client_types || '',
        desired_tone: initialData?.desired_tone || 'professionnel',
        staff_names: initialData?.staff_names || '',
        specific_instructions: initialData?.specific_instructions || '',

        // Rhythm
        reviews_per_day: initialData?.reviews_per_day || 3,
        rhythme_mode: initialData?.rhythme_mode || 'modere',
        estimated_duration_days: initialData?.estimated_duration_days || 0,

        client_cities: initialData?.client_cities || []
    });

    const handleSectorChange = (sector: any) => {
        setFormData(prev => ({
            ...prev,
            sector: sector.sector_name,
            sector_id: sector.id,
            sector_slug: sector.sector_slug,
            sector_difficulty: sector.difficulty
        }));
    };

    const handleRhythmeChange = (config: RhythmeConfig) => {
        setFormData(prev => ({
            ...prev,
            reviews_per_day: config.reviews_per_day,
            rhythme_mode: config.mode,
            estimated_duration_days: config.estimated_duration_days
        }));
    };

    const handleCitiesChange = (cities: string[]) => {
        setFormData(prev => ({
            ...prev,
            client_cities: cities,
            zones: cities.join(', ') // Auto-fill zones for legacy support
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.sector_slug) {
            showError('Erreur', "Veuillez sélectionner un secteur d'activité");
            return;
        }

        onNext(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="step-content">
            <h2 className="submission-card-title">Enrichissement du profil</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', marginTop: '-0.5rem' }}>
                Personnalisez votre campagne pour maximiser l'impact et la sécurité.
            </p>

            {/* 1. SECTEUR & DIFFICULTE */}
            <div className="form-group">
                {!!initialData?.establishment_id && !!initialData?.sector_slug ? (
                    <div style={{
                        padding: '1.25rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '1rem',
                        border: '2px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ fontSize: '1.5rem', backgroundColor: 'white', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                🏢
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{initialData.sector || formData.sector}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SYNCHRONISÉ AVEC VOTRE ÉTABLISSEMENT</div>
                            </div>
                        </div>
                        <CheckCircle color="#10b981" />
                    </div>
                ) : (
                    <>
                        <SectorSelect
                            selectedSectorSlug={formData.sector_slug}
                            onSectorChange={handleSectorChange}
                        />
                        {initialData?.establishment_id && !initialData?.sector_slug && (
                            <p style={{ fontSize: '0.75rem', color: '#ff3b6a', marginTop: '-1.25rem', marginBottom: '1.25rem' }}>
                                Note : Votre établissement n'a pas de secteur défini. Veuillez en sélectionner un.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* 2. VILLE DE L'ÉTABLISSEMENT */}
            <div className="form-group">
                {!!initialData?.establishment_id && !!initialData?.city ? (
                    <div style={{
                        padding: '1.25rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '1rem',
                        border: '2px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ fontSize: '1.5rem', backgroundColor: 'white', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                📍
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{initialData.city || formData.city}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>VILLE DE L'ÉTABLISSEMENT</div>
                            </div>
                        </div>
                        <CheckCircle color="#10b981" />
                    </div>
                ) : (
                    <>
                        <label className="form-label">Ville de l'établissement</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Ex: Bordeaux"
                            required
                        />
                        {initialData?.establishment_id && !initialData?.city && (
                            <p style={{ fontSize: '0.75rem', color: '#ff3b6a', marginTop: '0.4rem' }}>
                                Note : Votre établissement n'a pas de ville définie. Veuillez l'indiquer.
                            </p>
                        )}
                    </>
                )}
            </div>

            <LocalisationClients
                establishmentCity={formData.city}
                totalReviews={initialData?.quantity || 10} // Default if not passed
                onCitiesGenerated={handleCitiesChange}
            />

            {/* 3. RYTHME */}
            <RhythmeSlider
                totalReviews={initialData?.quantity || 10}
                sectorDifficulty={formData.sector_difficulty as any}
                onRhythmeChange={handleRhythmeChange}
            />

            {/* 4. DETAILS CONTENU */}
            <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '2rem 0' }}></div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a' }}>Détails rédactionnels</h3>

            <div className="form-group">
                <label className="form-label">Positionnement / Points forts</label>
                <textarea
                    className="form-textarea"
                    value={formData.positioning}
                    onChange={(e) => setFormData({ ...formData, positioning: e.target.value })}
                    placeholder="Qu'est-ce qui vous différencie ? (ex: réactivité, devis gratuit, 10 ans de garantie, propreté du chantier...)"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Type de clients ciblés</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.client_types}
                    onChange={(e) => setFormData({ ...formData, client_types: e.target.value })}
                    placeholder="Ex: Particuliers, Agences immobilières, Syndics"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Ton souhaité pour les avis</label>
                <select
                    className="form-select"
                    value={formData.desired_tone}
                    onChange={(e) => setFormData({ ...formData, desired_tone: e.target.value })}
                >
                    <option value="professionnel">Professionnel & Formel</option>
                    <option value="amical">Amical & Chaleureux</option>
                    <option value="enthousiaste">Enthousiaste & Dynamique</option>
                    <option value="sobre">Sobre & Factuel</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Noms des collaborateurs (Optionnel)</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.staff_names}
                    onChange={(e) => setFormData({ ...formData, staff_names: e.target.value })}
                    placeholder="Ex: Julie à l'accueil, Marc le technicien, le patron..."
                />
            </div>

            <div className="form-group">
                <label className="form-label">Instructions spécifiques (Optionnel)</label>
                <textarea
                    className="form-textarea"
                    value={formData.specific_instructions}
                    onChange={(e) => setFormData({ ...formData, specific_instructions: e.target.value })}
                    placeholder="Infos à inclure, consignes de rédaction, services particuliers à mettre en avant..."
                    style={{ minHeight: '100px' }}
                />
            </div>

            <div className="submission-actions">
                <button type="button" onClick={onBack} className="btn-back">
                    Retour
                </button>
                <button type="submit" className="btn-next">
                    Suivant (Génération IA)
                </button>
            </div>
        </form>
    );
};
