import React, { useState } from 'react';
import api from '../../services/api';
import { MapPin, RefreshCw, X } from 'lucide-react';
import { Button } from '../common/Button';
import toast from 'react-hot-toast';

interface LocalisationProps {
    establishmentCity: string;
    totalReviews: number;
    onCitiesGenerated: (cities: string[]) => void;
}

export const LocalisationClients: React.FC<LocalisationProps> = ({
    establishmentCity,
    totalReviews,
    onCitiesGenerated
}) => {
    const [cities, setCities] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const generateCities = async () => {
        if (!establishmentCity) {
            toast.error("Veuillez d'abord renseigner la ville de l'établissement.");
            return;
        }

        setLoading(true);
        try {
            const count = Math.min(10, Math.ceil(totalReviews / 2)); // Generate enough cities
            const response = await api.post('/anti-detection/generate-cities', {
                base_city: establishmentCity,
                count
            });

            if (response.data.success) {
                setCities(response.data.cities);
                onCitiesGenerated(response.data.cities);
                toast.success(`${response.data.cities.length} zones trouvées via IA`);
            }
        } catch (error) {
            toast.error("Erreur lors de la génération des villes.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const removeCity = (cityToRemove: string) => {
        const newCities = cities.filter(c => c !== cityToRemove);
        setCities(newCities);
        onCitiesGenerated(newCities);
    };

    return (
        <div style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="#0f172a" />
                Zones de provenance des clients
            </label>

            <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1.25rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', maxWidth: '70%' }}>
                        Générez des villes cohérentes via l'IA pour diversifier vos avis.
                        Vous pouvez supprimer celles qui ne vous conviennent pas.
                    </p>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={generateCities}
                        isLoading={loading}
                        disabled={!establishmentCity}
                    >
                        <RefreshCw size={14} style={{ marginRight: '0.5rem' }} />
                        Générer via IA
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
                        Cliquez sur générer pour obtenir des villes cibles
                    </div>
                )}
            </div>
        </div>
    );
};
