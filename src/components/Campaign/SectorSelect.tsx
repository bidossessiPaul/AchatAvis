import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AlertTriangle, CheckCircle, Info, Shield, Loader } from 'lucide-react';

interface Sector {
    sector_slug: string;
    sector_name: string;
    difficulty: 'easy' | 'medium' | 'hard';
    icon_emoji: string;
    warning_message?: string;
    tips?: string[];
}

interface SectorSelectProps {
    selectedSectorSlug: string;
    onSectorChange: (sector: Sector) => void;
}

export const SectorSelect: React.FC<SectorSelectProps> = ({ selectedSectorSlug, onSectorChange }) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

    useEffect(() => {
        fetchSectors();
    }, []);

    useEffect(() => {
        if (sectors.length > 0 && selectedSectorSlug) {
            const found = sectors.find(s => s.sector_slug === selectedSectorSlug);
            if (found) setSelectedSector(found);
        }
    }, [sectors, selectedSectorSlug]);

    const fetchSectors = async () => {
        try {
            const response = await api.get('/anti-detection/sectors');
            // Response format: { success: true, data: { easy: [], medium: [], hard: [] } }
            // Flatten the grouped data
            const grouped = response.data.data;
            const allSectors = [
                ...grouped.easy,
                ...grouped.medium,
                ...grouped.hard
            ];
            setSectors(allSectors);
        } catch (error) {
            console.error('Failed to fetch sectors', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const slug = e.target.value;
        const sector = sectors.find(s => s.sector_slug === slug);
        if (sector) {
            setSelectedSector(sector);
            onSectorChange(sector);
        }
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}><Loader size={16} className="animate-spin" /> Chargement des secteurs...</div>;

    return (
        <div className="form-group sector-select-container">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} color="#0f172a" />
                Secteur d'activité
                <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </label>

            <select
                className="form-select"
                value={selectedSector?.sector_slug || ''}
                onChange={handleChange}
                style={{ height: '3rem', fontSize: '1rem' }}
            >
                <option value="">-- Sélectionnez votre secteur --</option>

                <optgroup label="SECTEURS FACILES">
                    {sectors.filter(s => s.difficulty === 'easy').map(s => (
                        <option key={s.sector_slug} value={s.sector_slug}>{s.sector_name}</option>
                    ))}
                </optgroup>

                <optgroup label="SECTEURS MOYENS">
                    {sectors.filter(s => s.difficulty === 'medium').map(s => (
                        <option key={s.sector_slug} value={s.sector_slug}>{s.sector_name}</option>
                    ))}
                </optgroup>

                <optgroup label="SECTEURS DIFFICILES (Surveillances strictes)">
                    {sectors.filter(s => s.difficulty === 'hard').map(s => (
                        <option key={s.sector_slug} value={s.sector_slug}>{s.sector_name}</option>
                    ))}
                </optgroup>
            </select>

            {selectedSector && (
                <div style={{ marginTop: '1rem' }} className={`sector-info difficulty-${selectedSector.difficulty}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: selectedSector.difficulty === 'easy' ? '#dcfce7' : (selectedSector.difficulty === 'medium' ? '#fef3c7' : '#fee2e2'),
                            color: selectedSector.difficulty === 'easy' ? '#166534' : (selectedSector.difficulty === 'medium' ? '#b45309' : '#991b1b'),
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}>
                            {selectedSector.difficulty === 'easy' && <CheckCircle size={14} />}
                            {selectedSector.difficulty === 'medium' && <Info size={14} />}
                            {selectedSector.difficulty === 'hard' && <AlertTriangle size={14} />}
                            Secteur {selectedSector.difficulty === 'easy' ? 'Facile' : (selectedSector.difficulty === 'medium' ? 'Modéré' : 'Difficile')}
                        </div>
                    </div>

                    {selectedSector.difficulty === 'hard' && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            borderRadius: '0.75rem',
                            padding: '0.875rem',
                            fontSize: '0.875rem',
                            color: '#991b1b',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'start'
                        }}>
                            <AlertTriangle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Attention : Secteur surveillé</strong>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.25rem' }}>
                                    <li>Maximum 2 avis par jour recommandé</li>
                                    <li>Délai de modération de 72h possible</li>
                                    <li>Localisation GPS stricte appliquée</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
