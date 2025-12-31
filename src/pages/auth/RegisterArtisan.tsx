import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import type { ArtisanRegistration } from '../../types';
import './Auth.css';

const TRADES = [
    { value: 'plombier', label: 'Plombier' },
    { value: 'electricien', label: 'Électricien' },
    { value: 'chauffagiste', label: 'Chauffagiste' },
    { value: 'couvreur', label: 'Couvreur' },
    { value: 'vitrier', label: 'Vitrier' },
    { value: 'paysagiste', label: 'Paysagiste' },
    { value: 'menage', label: 'Ménage' },
    { value: 'demenageur', label: 'Déménageur' },
];

export const RegisterArtisan: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<ArtisanRegistration>({
        email: '',
        fullName: '',
        password: '',
        companyName: '',
        siret: '',
        trade: 'plombier',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        googleBusinessUrl: '',
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
            await authApi.registerArtisan(formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
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
            <div className="auth-content" style={{ maxWidth: '600px' }}>
                <div className="auth-logo">
                    <h1 className="auth-brand">
                        Achat<span className="text-brand">Avis</span>
                    </h1>
                    <p className="auth-tagline">Inscription Artisan</p>
                </div>

                <Card className="auth-card">
                    {success ? (
                        <div className="auth-success">
                            <h3>✓ Inscription réussie !</h3>
                            <p>Votre compte est en attente de validation par un administrateur.</p>
                            <p>Vous allez être redirigé vers la page de connexion...</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="auth-title">Créer un compte artisan</h2>

                            <form onSubmit={handleSubmit} className="auth-form">
                                {errors.global && <div className="auth-error">{errors.global}</div>}

                                <Input
                                    type="email"
                                    name="email"
                                    label="Email"
                                    placeholder="votre@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={errors.email}
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
                                    required
                                />

                                <Input
                                    type="password"
                                    name="password"
                                    label="Mot de passe"
                                    placeholder="Min. 8 caractères"
                                    helperText="Au moins 8 caractères"
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={errors.password}
                                    required
                                />

                                <Input
                                    type="text"
                                    name="companyName"
                                    label="Nom de l'entreprise"
                                    placeholder="Ex: Plomberie Martin"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    error={errors.companyName}
                                    required
                                />

                                <Input
                                    type="text"
                                    name="siret"
                                    label="SIRET (facultatif)"
                                    placeholder="14 chiffres"
                                    maxLength={14}
                                    value={formData.siret}
                                    onChange={handleChange}
                                    error={errors.siret}
                                />

                                <div className="input-wrapper">
                                    <label className="input-label">
                                        Métier <span className="input-required">*</span>
                                    </label>
                                    <select
                                        name="trade"
                                        className={`input ${errors.trade ? 'input-error' : ''}`}
                                        value={formData.trade}
                                        onChange={handleChange}
                                        required
                                    >
                                        {TRADES.map((trade) => (
                                            <option key={trade.value} value={trade.value}>
                                                {trade.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.trade && <p className="input-error-text">{errors.trade}</p>}
                                </div>

                                <Input
                                    type="tel"
                                    name="phone"
                                    label="Téléphone"
                                    placeholder="06 12 34 56 78"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    error={errors.phone}
                                    required
                                />

                                <Input
                                    type="text"
                                    name="address"
                                    label="Adresse"
                                    placeholder="12 rue de la République"
                                    value={formData.address}
                                    onChange={handleChange}
                                    error={errors.address}
                                    required
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
                                    <Input
                                        type="text"
                                        name="city"
                                        label="Ville"
                                        placeholder="Paris"
                                        value={formData.city}
                                        onChange={handleChange}
                                        error={errors.city}
                                        required
                                    />

                                    <Input
                                        type="text"
                                        name="postalCode"
                                        label="Code postal"
                                        placeholder="75001"
                                        maxLength={5}
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        error={errors.postalCode}
                                        required
                                    />
                                </div>

                                <Input
                                    type="url"
                                    name="googleBusinessUrl"
                                    label="URL Google My Business (optionnel)"
                                    placeholder="https://g.page/..."
                                    value={formData.googleBusinessUrl}
                                    onChange={handleChange}
                                    error={errors.googleBusinessUrl}
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
                </Card>
            </div >
        </div >
    );
};
