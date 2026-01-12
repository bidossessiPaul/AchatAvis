import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { Home, ArrowRight } from 'lucide-react';
import './NotFound.css';

export const NotFound: React.FC = () => {
    const [countdown, setCountdown] = useState(10);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (countdown <= 0) {
            handleRedirect();
        }
    }, [countdown]);

    const handleRedirect = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        switch (user.role) {
            case 'admin':
                navigate('/admin');
                break;
            case 'artisan':
                navigate('/artisan/dashboard');
                break;
            case 'guide':
                navigate('/guide/dashboard');
                break;
            default:
                navigate('/login');
        }
    };

    return (
        <div className="not-found-container">
            <div className="not-found-background">
                <div className="blob"></div>
                <div className="blob"></div>
                <div className="blob"></div>
            </div>

            <div className="not-found-card">
                <div className="not-found-glitch-wrapper">
                    <h1 className="not-found-title" data-text="404">404</h1>
                </div>

                <div className="not-found-content">
                    <h2 className="not-found-subtitle">Oups ! Page introuvable</h2>
                    <p className="not-found-text">
                        La page que vous recherchez semble s'être égarée dans le cloud.
                    </p>

                    <div className="countdown-container">
                        <div className="countdown-ring">
                            <svg>
                                <circle cx="35" cy="35" r="30"></circle>
                                <circle
                                    cx="35"
                                    cy="35"
                                    r="30"
                                    style={{
                                        strokeDashoffset: (188 * (10 - countdown)) / 10
                                    }}
                                ></circle>
                            </svg>
                            <span className="countdown-number">{countdown}</span>
                        </div>
                        <p className="countdown-label">Redirection automatique...</p>
                    </div>

                    <button onClick={handleRedirect} className="not-found-button">
                        <Home size={18} />
                        Retourner à l'accueil
                        <ArrowRight size={18} className="arrow-icon" />
                    </button>
                </div>
            </div>

            <div className="not-found-footer">
                <p>© 2026 AchatAvis - Excellence & Authenticité</p>
            </div>
        </div>
    );
};
