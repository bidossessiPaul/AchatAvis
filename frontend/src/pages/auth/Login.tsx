import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import './Auth.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, verify2FA, error, errorCode, isLoading, clearError, twoFactorRequired, detectedCountry } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [formError, setFormError] = useState('');

    React.useEffect(() => {
        const isGeoBlocked =
            errorCode === 'ACCOUNT_SUSPENDED' ||
            errorCode === 'COUNTRY_SUSPENDED' ||
            (error && (error.toLowerCase().includes('pays') || error.toLowerCase().includes('géographique')));

        if (isGeoBlocked) {
            // Error object in zustand might be just a string, we need to access the full response if possible or updated store
            // However, store only saves error message/code/country.
            // We need to update authStore to save userName on error or pass it some other way.
            // Wait, useAuthStore probably stores the error response data? No, just specific fields.
            // But 'error' in store is just the message string.
            // Let's check how `login` sets the error.
            navigate('/suspended', { state: { country: detectedCountry } });
        }
    }, [errorCode, error, detectedCountry, navigate]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        if (!email || !password) {
            setFormError('Veuillez remplir tous les champs');
            return;
        }

        try {
            const response = await login(email, password);

            if (!response.twoFactorRequired) {
                redirectUser();
            }
        } catch (err) {
            // Error is handled in store
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        if (!otpToken) {
            setFormError('Veuillez entrer le code 2FA');
            return;
        }

        try {
            await verify2FA(otpToken);
            redirectUser();
        } catch (err) {
            // Error is handled in store
        }
    };

    const redirectUser = () => {
        const user = useAuthStore.getState().user;
        if (user) {
            if (user.role === 'artisan') {
                navigate('/artisan');
            } else if (user.role === 'guide') {
                navigate('/guide');
            } else if (user.role === 'admin') {
                navigate('/admin');
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-content">
                <div className="auth-logo">
                    <h1 className="auth-brand">
                        Achat<span className="text-brand">Avis</span>
                    </h1>
                    <p className="auth-tagline">Gestion d'avis Google pour artisans</p>
                </div>

                <Card className="auth-card">
                    <h2 className="auth-title">
                        {twoFactorRequired ? 'Vérification 2FA' : 'Connexion'}
                    </h2>

                    {!twoFactorRequired ? (
                        <form onSubmit={handleLoginSubmit} className="auth-form">
                            {(error || formError) && errorCode !== 'ACCOUNT_SUSPENDED' && errorCode !== 'COUNTRY_SUSPENDED' && (
                                <div className="auth-error">
                                    {formError || error}
                                </div>
                            )}

                            <Input
                                type="email"
                                label="Email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <Input
                                type="password"
                                label="Mot de passe"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                isLoading={isLoading}
                            >
                                Se connecter
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifySubmit} className="auth-form">
                            {(error || formError) && (
                                <div className="auth-error">
                                    {formError || error}
                                </div>
                            )}

                            <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
                                Veuillez entrer le code de sécurité généré par votre application d'authentification.
                            </p>

                            <Input
                                type="text"
                                label="Code de sécurité"
                                placeholder="000000"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value)}
                                required
                                autoFocus
                                autoComplete="one-time-code"
                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px' }}
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                isLoading={isLoading}
                            >
                                Vérifier
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                fullWidth
                                onClick={() => window.location.reload()}
                                style={{ marginTop: '0.5rem' }}
                            >
                                Retour à la connexion
                            </Button>
                        </form>
                    )}

                    <div className="auth-links">
                        <Link to="/forgot-password" className="auth-link">
                            Mot de passe oublié ?
                        </Link>
                    </div>

                    <div className="auth-divider">
                        <span>OU</span>
                    </div>

                    <div className="auth-register">
                        <p>Vous n'avez pas de compte ?</p>
                        <div className="auth-register-buttons">
                            <Link to="/register/artisan">
                                <Button variant="secondary" fullWidth>
                                    Inscription Artisan
                                </Button>
                            </Link>
                            <Link to="/register/guide">
                                <Button variant="secondary" fullWidth>
                                    Inscription Local Guide
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
