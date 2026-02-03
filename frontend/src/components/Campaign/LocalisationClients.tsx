import React, { useState } from 'react';
import api from '../../services/api';
import { RefreshCw, X, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { showSuccess, showError } from '../../utils/Swal';

interface LocalisationProps {
    establishmentCity: string;
    onCitiesGenerated: (cities: string[]) => void;
}

export const LocalisationClients: React.FC<LocalisationProps> = ({
    establishmentCity,
    onCitiesGenerated
}) => {
    const [cities, setCities] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [manualInput, setManualInput] = useState("");

    const generateCities = async () => {
        if (!establishmentCity) {
            showError('Erreur', "Veuillez d'abord renseigner la ville de l'établissement.");
            return;
        }

        setLoading(true);
        try {
            const count = 10; // Fixed count as requested
            const response = await api.post('/anti-detection/generate-cities', {
                base_city: establishmentCity,
                count
            });

            if (response.data.success) {
                // Ensure unique cities and combine with existing if any? 
                // User said "les villes générer je veux 10 a chaque fois" - replacing seems to be current behavior
                setCities(response.data.cities);
                onCitiesGenerated(response.data.cities);
                showSuccess('Succès', `${response.data.cities.length} zones trouvées via IA`);
            }
        } catch (error) {
            showError('Erreur', "Erreur lors de la génération des villes.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualAdd = () => {
        if (!manualInput.trim()) return;

        // Support comma separated
        const newManualCities = manualInput.split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0 && !cities.includes(c));

        if (newManualCities.length === 0) return;

        const updatedCities = [...cities, ...newManualCities];
        setCities(updatedCities);
        onCitiesGenerated(updatedCities);
        setManualInput("");
    };

    const removeCity = (cityToRemove: string) => {
        const newCities = cities.filter(c => c !== cityToRemove);
        setCities(newCities);
        onCitiesGenerated(newCities);
    };

    return (
        <div style={{ marginBottom: '2rem' }}>
            <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: window.innerWidth <= 640 ? '1rem' : '1.25rem'
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Paris, Lyon, Marseille..."
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualAdd())}
                        style={{ marginBottom: 0, flex: 1 }}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={generateCities}
                        isLoading={loading}
                        disabled={!establishmentCity}
                        style={{ flexShrink: 0, height: '42px' }}
                    >
                        <RefreshCw size={14} />
                        <span className="btn-text-mobile-hide" style={{ marginLeft: '0.5rem' }}>Générer</span>
                    </Button>
                    <Button
                        type="button"
                        onClick={handleManualAdd}
                        disabled={!manualInput.trim()}
                        style={{ height: '42px', flexShrink: 0 }}
                    >
                        <Plus size={16} />
                        <span className="btn-text-mobile-hide" style={{ marginLeft: '0.5rem' }}>Ajouter</span>
                    </Button>
                </div>

                {cities.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {cities.map((city, idx) => (
                            <div key={idx} style={{
                                background: '#f1f5f9',
                                padding: '0.35rem 0.5rem 0.35rem 0.75rem',
                                borderRadius: '2rem',
                                fontSize: '0.75rem',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: '1px solid #e2e8f0'
                            }}>
                                {city}
                                <button
                                    type="button"
                                    onClick={() => removeCity(city)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 0,
                                        color: '#94a3b8'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        border: '2px dashed #e2e8f0',
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: '#94a3b8'
                    }}>
                        Aucune ville sélectionnée
                    </div>
                )}
            </div>
        </div>
    );
};
