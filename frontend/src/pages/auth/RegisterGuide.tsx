import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import type { GuideRegistration } from '../../types';
import { RegionBadge } from '../../components/common/RegionBadge';
import { Sparkles, Mail, User, Lock, Smartphone, MapPin } from 'lucide-react';
import './Auth.css';
import { ParticlesBackground } from '../../components/common/ParticlesBackground';

export const RegisterGuide: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<GuideRegistration>({
        email: '',
        fullName: '',
        password: '',
        googleEmail: '',
        phone: '',
        city: '',
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);

        try {
            await authApi.registerGuide(formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            if (err.response?.data?.code === 'ACCOUNT_SUSPENDED' || err.response?.data?.code === 'COUNTRY_SUSPENDED') {
                navigate('/suspended', { state: { country: err.response?.data?.country } });
                return;
            }
            if (err.response?.data?.details) {
                // Backend Zod errors
                const newErrors: Record<string, string> = {};
                err.response.data.details.forEach((detail: any) => {
                    const field = detail.path[0];
                    newErrors[field] = detail.message;
                });
                setErrors(newErrors);
            } else {
                // Generic error
                setErrors({ global: err.response?.data?.error || 'Erreur lors de l\'inscription.' });
            }
        } finally {
            setIsLoading(false);
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
                    <p className="auth-tagline">Inscription Local Guide</p>
                </div>

                <Card className="auth-card">
                    {success ? (
                        <div className="auth-success">
                            <h3>✓ Inscription réussie !</h3>
                            <p>Votre compte a été créé avec succès.</p>
                            <p>Vous allez être redirigé vers la page de connexion...</p>
                        </div>
                    ) : (
                        <>
                            <div className="auth-header" style={{ textAlign: 'center' }}>
                                <h2 className="auth-title">Créer un compte Local Guide</h2>
                                <p className="auth-subtitle">Gagnez de l'argent en partageant vos expériences authentiques.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form">
                                {errors.global && <div className="auth-error">{errors.global}</div>}

                                <Input
                                    type="email"
                                    name="email"
                                    label="Email de connexion"
                                    placeholder="votre@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={errors.email}
                                    icon={<Mail size={18} />}
                                    required
                                />

                                <Input
                                    type="text"
                                    name="fullName"
                                    label="Nom Complet"
                                    placeholder="Prénom Nom"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    error={errors.fullName}
                                    icon={<User size={18} />}
                                    required
                                />

                                <Input
                                    type="password"
                                    name="password"
                                    label="Mot de passe"
                                    placeholder="Min. 8 caractères"
                                    helperText="Min. 8 caractères"
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={errors.password}
                                    icon={<Lock size={18} />}
                                    required
                                />

                                <Input
                                    type="email"
                                    name="googleEmail"
                                    label="Email Google (Local Guide)"
                                    placeholder="votre@gmail.com"
                                    helperText="L'email de votre compte Google Local Guide"
                                    value={formData.googleEmail}
                                    onChange={handleChange}
                                    error={errors.googleEmail}
                                    icon={<Mail size={18} />}
                                    required
                                />

                                <Input
                                    type="tel"
                                    name="phone"
                                    label="Téléphone"
                                    placeholder="06 12 34 56 78"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    error={errors.phone}
                                    icon={<Smartphone size={18} />}
                                    required
                                />

                                <Input
                                    type="text"
                                    name="city"
                                    label="Localité"
                                    placeholder="Paris"
                                    value={formData.city}
                                    onChange={handleChange}
                                    error={errors.city}
                                    icon={<MapPin size={18} />}
                                    required
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    isLoading={isLoading}
                                >
                                    Créer mon compte
                                </Button>
                            </form>

                            <div className="auth-links" style={{ marginTop: 'var(--space-6)' }}>
                                <Link to="/login" className="auth-link">
                                    Déjà un compte ? Se connecter
                                </Link>
                            </div>
                        </>
                    )}
                    <RegionBadge />
                </Card>
            </div>
        </div>
    );
};
