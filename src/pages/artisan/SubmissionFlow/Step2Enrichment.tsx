import React, { useState } from 'react';
import { ReviewOrder } from '../../../types';
import { RhythmeSlider, RhythmeConfig } from '../../../components/Campaign/RhythmeSlider';
import { LocalisationClients } from '../../../components/Campaign/LocalisationClients';
import { HelpCircle } from 'lucide-react';

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

        services: initialData?.services || '',
        staff_names: initialData?.staff_names || '',
        specific_instructions: initialData?.specific_instructions || '',

        // Rhythm
        reviews_per_day: initialData?.reviews_per_day || 3,
        rhythme_mode: initialData?.rhythme_mode || 'modere',
        estimated_duration_days: initialData?.estimated_duration_days || 0,

        client_cities: initialData?.client_cities || []
    });


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
        onNext(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="step-content">
            <h2 className="submission-card-title">Détails de votre mission</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', marginTop: '-0.5rem' }}>
                Précisez ce que vous faites pour que l'IA génère les avis les plus pertinents.
            </p>


            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                    Zone d'intervention du client
                    <div className="info-tooltip-container">
                        <HelpCircle size={14} />
                        <span className="info-tooltip-text">
                            Sélectionnez les villes où se situent vos clients pour que l'IA puisse localiser les avis de manière cohérente.
                        </span>
                    </div>
                </label>
                <LocalisationClients
                    establishmentCity={formData.city}
                    onCitiesGenerated={handleCitiesChange}
                />
            </div>

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
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Mes services
                    <div className="info-tooltip-container">
                        <HelpCircle size={14} />
                        <span className="info-tooltip-text">
                            Listez les services que vous avez réalisés pour vos clients. Plus vous êtes précis, plus les avis générés seront réalistes.
                        </span>
                    </div>
                </label>
                <textarea
                    className="form-textarea"
                    value={formData.services}
                    onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                    placeholder="Ex: Pose de chassis, Rénovation complète, Entretien toiture, Extension..."
                    required
                    style={{ minHeight: '100px' }}
                />
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Séparez vos différents services par des virgules pour une meilleure précision.
                </p>
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
                    placeholder="Infos à inclure, consignes de rédaction particulières..."
                    style={{ minHeight: '80px' }}
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
