import React, { useState } from 'react';
import { ReviewOrder } from '../../../types';

interface Step2Props {
    initialData: Partial<ReviewOrder> | null;
    onNext: (data: Partial<ReviewOrder>) => void;
    onBack: () => void;
}

export const Step2Enrichment: React.FC<Step2Props> = ({ initialData, onNext, onBack }) => {
    const [formData, setFormData] = useState({
        sector: initialData?.sector || '',
        zones: initialData?.zones || '',
        positioning: initialData?.positioning || '',
        client_types: initialData?.client_types || '',
        desired_tone: initialData?.desired_tone || 'professionnel',
        staff_names: initialData?.staff_names || '',
        specific_instructions: initialData?.specific_instructions || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNext(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="submission-card-title">Enrichissement du profil</h2>

            <div className="form-group">
                <label className="form-label">Secteur d'activité précis</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="Ex: Rénovation de salles de bain haut de gamme"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Zones desservies</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.zones}
                    onChange={(e) => setFormData({ ...formData, zones: e.target.value })}
                    placeholder="Ex: Bordeaux et CUB, Arcachon"
                    required
                />
            </div>

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
                <span style={{ fontSize: '0.8125rem', color: '#666', marginTop: '0.5rem', display: 'block' }}>
                    Indiquez les noms des personnes que vous aimeriez voir citées dans certains avis.
                </span>
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
                    Suivant
                </button>
            </div>
        </form>
    );
};
