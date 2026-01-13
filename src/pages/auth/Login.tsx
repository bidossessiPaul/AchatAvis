import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Sparkles, User, MapPin, ArrowRight, Lock, Mail } from 'lucide-react';
import './Auth.css';

import { ParticlesBackground } from '../../components/common/ParticlesBackground';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, verify2FA, error, errorCode, isLoading, clearError, twoFactorRequired, detectedCountry, suspendedUserName, suspension } = useAuthStore();

    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
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
                    <h1 className="auth-brand">
                        <Sparkles className="brand-icon" size={32} />
                        AchatAvis
                    </h1>
                    <p className="auth-tagline">Boostez votre e-réputation Google</p>
                </div>

                <div className="auth-toggle-container">
                    <button
                        className={`auth-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
                        onClick={() => { setAuthMode('login'); clearError(); setFormError(''); }}
                    >
                        Connexion
                    </button>
                    <button
                        className={`auth-toggle-btn ${authMode === 'register' ? 'active' : ''}`}
                        onClick={() => { setAuthMode('register'); clearError(); setFormError(''); }}
                    >
                        Inscription
                    </button>
                </div>

                <Card className="auth-card">
                    {authMode === 'login' ? (
                        <>
                            <div className="auth-header">
                                <h2 className="auth-title">
                                    {twoFactorRequired ? 'Vérification 2FA' : 'Bon retour !'}
                                </h2>
                                <p className="auth-subtitle">
                                    {twoFactorRequired
                                        ? 'Entrez le code généré par votre application.'
                                        : 'Connectez-vous pour gérer vos avis.'}
                                </p>
                            </div>

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
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        Se connecter
                                    </Button>

                                    <div className="auth-links">
                                        <Link to="/forgot-password" className="auth-link">
                                            Mot de passe oublié ?
                                        </Link>
                                    </div>
                                </form>
                            ) : (
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
                            )}
                        </>
                    ) : (
                        <>
                            <div className="auth-header">
                                <h2 className="auth-title">Créer un compte</h2>
                                <p className="auth-subtitle">Choisissez votre profil pour commencer l'aventure.</p>
                            </div>

                            <div className="registration-choice-grid">
                                <Link to="/register/artisan" className="choice-card">
                                    <div className="choice-icon-wrapper">
                                        <User size={24} />
                                    </div>
                                    <div className="choice-info">
                                        <h3>Je suis un Artisan</h3>
                                        <p>Je souhaite obtenir plus d'avis positifs sur ma fiche Google Business.</p>
                                    </div>
                                    <ArrowRight className="choice-arrow" size={20} />
                                </Link>

                                <Link to="/register/guide" className="choice-card">
                                    <div className="choice-icon-wrapper">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="choice-info">
                                        <h3>Je suis un Guide Local</h3>
                                        <p>Je souhaite gagner de l'argent en rédigeant des avis authentiques.</p>
                                    </div>
                                    <ArrowRight className="choice-arrow" size={20} />
                                </Link>
                            </div>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
};
