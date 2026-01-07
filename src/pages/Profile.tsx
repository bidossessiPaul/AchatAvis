import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import api, { authApi } from '../services/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Camera, Mail, Shield, Save, User as UserIcon, Settings, Globe, Loader } from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../utils/Swal';
import { GmailAccountList } from '../components/AntiDetection/GmailAccountList';
import { AddGmailModal } from '../components/AntiDetection/AddGmailModal';
import { useAntiDetectionStore } from '../context/antiDetectionStore';
import './Profile.css';

interface Sector {
    sector_slug: string;
    sector_name: string;
    difficulty: string;
}

export const Profile: React.FC = () => {
    const { user, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [is2FALoading, setIs2FALoading] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [isLoadingSectors, setIsLoadingSectors] = useState(true);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fullName: user?.full_name || '',
        companyName: user?.company_name || '',
        siret: user?.siret || '',
        trade: user?.trade || '',
        phone: user?.phone || '',
        address: user?.address || '',
        city: user?.city || '',
        postalCode: user?.postal_code || '',
        googleBusinessUrl: user?.google_business_url || '',
        googleEmail: user?.google_email || '',
    });
    const [activeTab, setActiveTab] = useState<'info' | 'gmail'>('info');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { fetchGmailAccounts } = useAntiDetectionStore();
    const location = useLocation();

    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const response = await api.get('/anti-detection/sectors');
                const grouped = response.data.data;
                const allSectors = [
                    ...grouped.easy,
                    ...grouped.medium,
                    ...grouped.hard
                ];
                setSectors(allSectors);
                // If trade is empty, set a default from the list if available
                if (!user?.trade && allSectors.length > 0) {
                    setFormData(prev => ({ ...prev, trade: allSectors[0].sector_slug }));
                }
            } catch (error) {
                console.error("Failed to fetch sectors", error);
            } finally {
                setIsLoadingSectors(false);
            }
        };
        fetchSectors();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'gmail') {
            setActiveTab('gmail');
        }
    }, [location]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authApi.updateProfile(formData);
            if (response.user) {
                setUser({ ...user, ...response.user } as any);
                showSuccess('Profil mis à jour avec succès');
            }
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la mise à jour du profil');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple validation
        if (file.size > 5 * 1024 * 1024) {
            return showError('Fichier trop volumineux', 'La taille maximale est de 5Mo');
        }

        setIsAvatarLoading(true);

        try {
            const { avatarUrl } = await authApi.uploadAvatar(file);
            if (user) {
                setUser({ ...user, avatar_url: avatarUrl });
            }
            showSuccess('Succès', 'Avatar mis à jour !');
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de l\'envoi de l\'image');
        } finally {
            setIsAvatarLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return showError('Erreur', 'Les mots de passe ne correspondent pas');
        }

        setIsPasswordLoading(true);
        try {
            await authApi.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            showSuccess('Succès', 'Mot de passe modifié avec succès');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors du changement de mot de passe');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleGenerate2FA = async () => {
        setIs2FALoading(true);
        try {
            const { secret, qrCode } = await authApi.generate2FA( /* currentPassword optional? */);
            setTwoFactorSecret(secret);
            setQrCodeUrl(qrCode);
            setShow2FASetup(true);
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la génération du 2FA');
        } finally {
            setIs2FALoading(false);
        }
    };

    const handleEnable2FA = async () => {
        if (!twoFactorSecret || !twoFactorToken) return;
        setIs2FALoading(true);
        try {
            await authApi.enable2FA({ secret: twoFactorSecret, token: twoFactorToken });
            if (user) setUser({ ...user, two_factor_enabled: true });
            setShow2FASetup(false);
            setTwoFactorSecret(null);
            setQrCodeUrl(null);
            setTwoFactorToken('');
            showSuccess('Succès', 'Double authentification activée !');
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Code invalide');
        } finally {
            setIs2FALoading(false);
        }
    };

    const handleDisable2FA = async () => {
        const result = await showConfirm(
            'Désactiver le 2FA ?',
            'Voulez-vous vraiment désactiver la double authentification ?'
        );

        if (!result.isConfirmed) return;

        setIs2FALoading(true);
        try {
            await authApi.disable2FA();
            if (user) setUser({ ...user, two_factor_enabled: false });
            showSuccess('Succès', 'Double authentification désactivée');
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la désactivation');
        } finally {
            setIs2FALoading(false);
        }
    };

    return (
        <DashboardLayout title="Mon Profil">
            <div className="profile-container">
                <div className="profile-grid">
                    {/* Public Profile Card */}
                    <div className="profile-main">
                        <Card className="profile-card hero-card" style={{ marginBottom: '1.5rem' }}>
                            <div className="profile-header">
                                <div className="avatar-wrapper">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name} className="profile-avatar" />
                                    ) : (
                                        <div className="profile-avatar-placeholder">
                                            <UserIcon size={48} />
                                        </div>
                                    )}
                                    {isAvatarLoading && (
                                        <div className="avatar-loading-overlay">
                                            <div className="spinner"></div>
                                        </div>
                                    )}
                                    <button
                                        className="avatar-edit-btn"
                                        onClick={handleAvatarClick}
                                        disabled={isAvatarLoading}
                                        title="Changer de photo"
                                    >
                                        <Camera size={18} />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                <div className="profile-info-header">
                                    <h2 className="profile-name">{user?.full_name}</h2>
                                    <div className="profile-role-badge">
                                        {user?.role.toUpperCase()}
                                    </div>
                                    <p className="profile-email">
                                        <Mail size={14} /> {user?.email}
                                    </p>
                                    {user?.role === 'artisan' && user?.company_name && (
                                        <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-500)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Globe size={14} /> {user.company_name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Tab Navigation */}
                        {user?.role === 'guide' && (
                            <div className="profile-tabs">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                >
                                    <Settings size={18} /> Informations & Sécurité
                                </button>
                                <button
                                    onClick={() => setActiveTab('gmail')}
                                    className={`profile-tab-btn ${activeTab === 'gmail' ? 'active' : ''}`}
                                >
                                    <Globe size={18} /> Gestion des Gmails
                                </button>
                            </div>
                        )}

                        {activeTab === 'info' ? (
                            <>
                                <Card className="profile-card">
                                    <h3 className="card-title">Informations Personnelles</h3>
                                    <form onSubmit={handleProfileSubmit} className="profile-form">
                                        <div style={{ display: 'grid', gridTemplateColumns: (user?.role === 'artisan' || user?.role === 'guide') ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                            <Input
                                                label="Nom Complet"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleProfileChange}
                                                placeholder="Votre nom complet"
                                                required
                                            />
                                            {(user?.role === 'artisan' || user?.role === 'guide') && (
                                                <Input
                                                    label="Téléphone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleProfileChange}
                                                    placeholder="06 00 00 00 00"
                                                    required
                                                />
                                            )}
                                        </div>

                                        {user?.role === 'guide' && (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                                    <Input
                                                        label="Email Google (Local Guide)"
                                                        name="googleEmail"
                                                        value={formData.googleEmail}
                                                        onChange={handleProfileChange}
                                                        placeholder="votre.compte@gmail.com"
                                                        required
                                                    />
                                                    <Input
                                                        label="Ville"
                                                        name="city"
                                                        value={formData.city}
                                                        onChange={handleProfileChange}
                                                        placeholder="Paris"
                                                        required
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {user?.role === 'artisan' && (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                                    <Input
                                                        label="Nom de l'entreprise"
                                                        name="companyName"
                                                        value={formData.companyName}
                                                        onChange={handleProfileChange}
                                                        placeholder="Ma Société"
                                                        required
                                                    />
                                                    <Input
                                                        label="SIRET"
                                                        name="siret"
                                                        value={formData.siret}
                                                        onChange={handleProfileChange}
                                                        placeholder="14 chiffres"
                                                    />
                                                </div>

                                                <div className="input-wrapper" style={{ marginTop: '1rem' }}>
                                                    <label className="input-label">Corps de métier</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <select
                                                            name="trade"
                                                            className="input"
                                                            value={formData.trade}
                                                            onChange={handleProfileChange}
                                                            disabled={isLoadingSectors}
                                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--gray-200)', paddingRight: '2.5rem' }}
                                                        >
                                                            {isLoadingSectors ? (
                                                                <option value="">Chargement des secteurs...</option>
                                                            ) : (
                                                                <>
                                                                    <optgroup label="Secteurs Faciles">
                                                                        {sectors.filter(s => s.difficulty === 'easy').map(s => (
                                                                            <option key={s.sector_slug} value={s.sector_slug}>{s.sector_name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                    <optgroup label="Secteurs Moyens">
                                                                        {sectors.filter(s => s.difficulty === 'medium').map(s => (
                                                                            <option key={s.sector_slug} value={s.sector_slug}>{s.sector_name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                    <optgroup label="Secteurs Difficiles">
                                                                        {sectors.filter(s => s.difficulty === 'hard').map(s => (
                                                                            <option key={s.sector_slug} value={s.sector_slug}>{s.sector_name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                </>
                                                            )}
                                                        </select>
                                                        {isLoadingSectors && (
                                                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                                                                <Loader size={16} className="animate-spin" style={{ color: '#94a3b8' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '1rem' }}>
                                                    <Input
                                                        label="Adresse"
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleProfileChange}
                                                        placeholder="123 rue de..."
                                                        required
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                                    <Input
                                                        label="Ville"
                                                        name="city"
                                                        value={formData.city}
                                                        onChange={handleProfileChange}
                                                        placeholder="Paris"
                                                        required
                                                    />
                                                    <Input
                                                        label="Code Postal"
                                                        name="postalCode"
                                                        value={formData.postalCode}
                                                        onChange={handleProfileChange}
                                                        placeholder="75000"
                                                        required
                                                    />
                                                </div>

                                                <div style={{ marginTop: '1rem' }}>
                                                    <Input
                                                        label="URL Google My Business"
                                                        name="googleBusinessUrl"
                                                        value={formData.googleBusinessUrl}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://maps.google.com/..."
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="form-actions">
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                isLoading={isLoading}
                                            >
                                                <Save size={18} style={{ marginRight: '8px' }} />
                                                Enregistrer les modifications
                                            </Button>
                                        </div>
                                    </form>
                                </Card>

                                {/* 2FA Section (Moved inside tab) */}
                                <Card className="profile-card">
                                    <h3 className="card-title">
                                        <Shield size={20} style={{ marginRight: '8px', verticalAlign: 'middle', color: user?.two_factor_enabled ? '#10b981' : '#6b7280' }} />
                                        Double Authentification (2FA)
                                    </h3>
                                    <div className="two-factor-content">
                                        {user?.two_factor_enabled ? (
                                            <div className="two-factor-active">
                                                <div className="status-badge-container">
                                                    <span className="status-badge active" style={{ backgroundColor: '#ecfdf5', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                                        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
                                                        Activée
                                                    </span>
                                                </div>
                                                <p style={{ margin: '1rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                                                    Votre compte est protégé par une double authentification. Un code vous sera demandé lors de chaque connexion.
                                                </p>
                                                <Button
                                                    variant="secondary"
                                                    onClick={handleDisable2FA}
                                                    isLoading={is2FALoading}
                                                    fullWidth
                                                >
                                                    Désactiver le 2FA
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="two-factor-inactive">
                                                {!show2FASetup ? (
                                                    <>
                                                        <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                                            Renforcez la sécurité de votre compte en activant la double authentification par application (Google Authenticator, Authy...).
                                                        </p>
                                                        <Button
                                                            variant="primary"
                                                            onClick={handleGenerate2FA}
                                                            isLoading={is2FALoading}
                                                            fullWidth
                                                        >
                                                            Activer le 2FA
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="two-factor-setup" style={{ textAlign: 'center' }}>
                                                        <p style={{ marginBottom: '1rem', fontWeight: 600 }}>Scannez ce QR Code avec votre application 2FA :</p>
                                                        {qrCodeUrl && (
                                                            <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', border: '1px solid #f3f4f6', marginBottom: '1.5rem' }}>
                                                                <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '200px', height: '200px' }} />
                                                            </div>
                                                        )}
                                                        <div style={{ marginBottom: '1.5rem' }}>
                                                            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Ou entrez ce code manuellement :</p>
                                                            <code style={{ background: '#f3f4f6', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, letterSpacing: '1px' }}>
                                                                {twoFactorSecret}
                                                            </code>
                                                        </div>
                                                        <Input
                                                            label="Entrez le code de vérification"
                                                            value={twoFactorToken}
                                                            onChange={(e) => setTwoFactorToken(e.target.value)}
                                                            placeholder="000000"
                                                            style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px' }}
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                                            <Button variant="secondary" onClick={() => setShow2FASetup(false)}>Annuler</Button>
                                                            <Button variant="primary" onClick={handleEnable2FA} isLoading={is2FALoading}>Vérifier</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </>
                        ) : (
                            <Card className="profile-card">
                                <GmailAccountList onAddClick={() => setIsAddModalOpen(true)} />
                            </Card>
                        )}
                    </div>

                    {/* Sidebar / Security Info */}
                    <div className="profile-sidebar">
                        <Card className="profile-card">
                            <h3 className="card-title">
                                <Shield size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Sécurité
                            </h3>
                            <form onSubmit={handlePasswordSubmit} className="password-form">
                                <Input
                                    type="password"
                                    label="Mot de passe actuel"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    required
                                />
                                <Input
                                    type="password"
                                    label="Nouveau mot de passe"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                />
                                <Input
                                    type="password"
                                    label="Confirmer le nouveau mot de passe"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                />
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    fullWidth
                                    isLoading={isPasswordLoading}
                                >
                                    Changer le mot de passe
                                </Button>
                            </form>
                        </Card>

                        <Card className="profile-card info-box">
                            <h4>Statut du compte</h4>
                            <div className="status-item">
                                <span className="label">Rôle:</span>
                                <span className="value">{user?.role}</span>
                            </div>
                            <div className="status-item">
                                <span className="label">Statut:</span>
                                <span className="value status-badge active">{user?.status}</span>
                            </div>
                            <div className="status-item">
                                <span className="label">Inscrit le:</span>
                                <span className="value">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
            <AddGmailModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => user && fetchGmailAccounts(user.id)}
            />
        </DashboardLayout>
    );
};
