import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { authApi } from '../../services/api';
import './Auth.css';

export const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Jeton de réinitialisation manquant ou invalide.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!token) {
            setError('Jeton de réinitialisation manquant.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.resetPassword({ token, newPassword });
            setMessage(response.message);
            // Optionally redirect after a few seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Une erreur est survenue lors de la réinitialisation.');
        } finally {
            setIsLoading(false);
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
                    <h2 className="auth-title">Réinitialiser le mot de passe</h2>

                    {message ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className="auth-success" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '0.5rem', border: '1px solid #10b981' }}>
                                {message}
                            </div>
                            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                                Redirection vers la page de connexion dans quelques secondes...
                            </p>
                            <Button
                                type="button"
                                variant="primary"
                                fullWidth
                                onClick={() => navigate('/login')}
                            >
                                Se connecter maintenant
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
                                type="password"
                                label="Nouveau mot de passe"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={!token || isLoading}
                                required
                            />

                            <Input
                                type="password"
                                label="Confirmer le mot de passe"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={!token || isLoading}
                                required
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                isLoading={isLoading}
                                disabled={!token}
                            >
                                Réinitialiser le mot de passe
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
