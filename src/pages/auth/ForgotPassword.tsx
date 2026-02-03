import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { authApi } from '../../services/api';
import { ParticlesBackground } from '../../components/common/ParticlesBackground';
import './Auth.css';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!email) {
            setError('Veuillez entrer votre adresse email');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.forgotPassword(email);
            setMessage(response.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Une erreur est survenue lors de la demande.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <ParticlesBackground />
            <div className="auth-content">
                <div className="auth-logo">
                    <img src="/logo.png" alt="AchatAvis" className="auth-logo-img" />
                    <p className="auth-tagline">Gestion d'avis Google pour artisans</p>
                </div>

                <Card className="auth-card">
                    <h2 className="auth-title">Mot de passe oublié</h2>
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
                        Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                    </p>

                    {message ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className="auth-success" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '0.5rem', border: '1px solid #10b981' }}>
                                {message}
                            </div>
                            <Button
                                type="button"
                                variant="primary"
                                fullWidth
                                onClick={() => navigate('/login')}
                            >
                                Retour à la connexion
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="auth-form">
                            {error && (
                                <div className="auth-error">
                                    {error}
                                </div>
                            )}

                            <Input
                                type="email"
                                label="Email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                isLoading={isLoading}
                            >
                                Envoyer le lien
                            </Button>

                            <div className="auth-links" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <Link to="/login" className="auth-link">
                                    Retour à la connexion
                                </Link>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};
