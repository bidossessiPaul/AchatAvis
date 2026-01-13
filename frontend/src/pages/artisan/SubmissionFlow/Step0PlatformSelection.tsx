import React from 'react';
import { MapPin, Globe, Search, CheckCircle } from 'lucide-react';
import './SubmissionFlow.css';

interface Platform {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
}

interface Step0Props {
    onNext: (platformId: string) => void;
    initialPlatform?: string | null;
}

export const Step0PlatformSelection: React.FC<Step0Props> = ({ onNext, initialPlatform }) => {
    const platforms: Platform[] = [
        { id: 'google', name: 'Google Maps', icon: <MapPin size={32} />, color: '#4285F4' },
        { id: 'trustpilot', name: 'Trustpilot', icon: <CheckCircle size={32} />, color: '#00B67A' },
        { id: 'pagesjaunes', name: 'Pages Jaunes', icon: <Search size={32} />, color: '#FFD700' },
        { id: 'other', name: 'Autre / Inconnu', icon: <Globe size={32} />, color: '#6366F1' }
    ];

    return (
        <div className="step-content animate-in">
            <h2 className="submission-card-title">Choisir une plateforme</h2>
            <p className="submission-card-subtitle">
                Sur quelle plateforme souhaitez-vous lancer cette campagne d'avis ?
            </p>

            <div className="platforms-selection-grid">
                {platforms.map(p => (
                    <button
                        key={p.id}
                        type="button"
                        className={`platform-select-card ${initialPlatform === p.id ? 'selected' : ''}`}
                        onClick={() => onNext(p.id)}
                    >
                        <div className="platform-select-icon" style={{ color: p.color, backgroundColor: `${p.color}15` }}>
                            {p.icon}
                        </div>
                        <h3>{p.name}</h3>
                        <p>{initialPlatform === p.id ? 'Sélectionné' : 'Cliquer pour choisir'}</p>
                    </button>
                ))}
            </div>

            <style>{`
                .platforms-selection-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-top: 2rem;
                }

                .platform-select-card {
                    background: white;
                    border: 2px solid #e2e8f0;
                    border-radius: 1.25rem;
                    padding: 2rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }

                .platform-select-card:hover, .platform-select-card.selected {
                    border-color: var(--primary-brand);
                    transform: translateY(-4px);
                    box-shadow: 0 12px 20px -8px rgba(255, 59, 106, 0.15);
                }
                
                .platform-select-card.selected {
                    background: #fff1f2;
                }

                .platform-select-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 0.5rem;
                }

                .platform-select-card h3 {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                }

                .platform-select-card p {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin: 0;
                }
            `}</style>
        </div>
    );
};
