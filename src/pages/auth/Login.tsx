import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Lock, Mail } from 'lucide-react';
import './Auth.css';

import { ParticlesBackground } from '../../components/common/ParticlesBackground';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, verify2FA, error, errorCode, isLoading, clearError, twoFactorRequired, detectedCountry, suspendedUserName, suspension } = useAuthStore();

    const [userType, setUserType] = useState<'artisan' | 'guide'>('artisan');
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
            navigate('/suspended', {
                state: {
                    country: detectedCountry,
                    userName: suspendedUserName,
                    suspension: suspension
                }
            });
        }
    }, [errorCode, error, detectedCountry, suspendedUserName, suspension, navigate]);

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
            <ParticlesBackground />
            <div className="auth-content">
                <div className="auth-logo">
                    <img src="/logo.png" alt="AchatAvis" className="auth-logo-img" />
                    <p className="auth-tagline">Boostez votre e-réputation Google</p>
                </div>

                <div className="auth-toggle-container">
                    <button
                        className={`auth-toggle-btn ${userType === 'artisan' ? 'active' : ''} artisan-mode`}
                        onClick={() => { setUserType('artisan'); clearError(); setFormError(''); }}
                    >
                        Artisan
                    </button>
                    <button
                        className={`auth-toggle-btn ${userType === 'guide' ? 'active' : ''} guide-mode`}
                        onClick={() => { setUserType('guide'); clearError(); setFormError(''); }}
                    >
                        Guide Local
                    </button>
                </div>

                <Card className={`auth-card ${userType === 'artisan' ? 'artisan-theme' : 'guide-theme'}`}>
                    {!twoFactorRequired ? (
                        <>
                            <div className="auth-header">
                                <h2 className="auth-title">Bon retour !</h2>
                                <p className="auth-subtitle">
                                    {userType === 'artisan'
                                        ? 'Connectez-vous pour gérer vos avis.'
                                        : 'Connectez-vous pour rédiger des avis.'}
                                </p>
                            </div>

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
                                    icon={<Mail size={18} />}
                                    required
                                />

                                <Input
                                    type="password"
                                    label="Mot de passe"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={<Lock size={18} />}
                                    required
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    isLoading={isLoading}
                                    style={{ marginTop: '0.3rem' }}
                                    className={userType === 'artisan' ? 'btn-artisan' : 'btn-guide'}
                                >
                                    Se connecter
                                </Button>

                                <div className="auth-links">
                                    <Link to="/forgot-password" className="auth-link">
                                        Mot de passe oublié ?
                                    </Link>
                                    <br />
                                    <Link
                                        to={userType === 'artisan' ? '/register/artisan' : '/register/guide'}
                                        className="auth-link register-link"
                                    >
                                        {userType === 'artisan' ? 'Créer un compte artisan' : 'Créer un compte guide'}
                                    </Link>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="auth-header">
                                <h2 className="auth-title">Vérification 2FA</h2>
                                <p className="auth-subtitle">Entrez le code généré par votre application.</p>
                            </div>

                            <form onSubmit={handleVerifySubmit} className="auth-form">
                                {(error || formError) && (
                                    <div className="auth-error">
                                        {formError || error}
                                    </div>
                                )}

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
                                    style={{ marginTop: '0.5rem', color: '#94a3b8' }}
                                >
                                    Retour à la connexion
                                </Button>
                            </form>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
};
