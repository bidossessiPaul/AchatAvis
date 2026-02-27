import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { showSuccess, showError } from '../../utils/Swal';

interface LevelVerificationModalProps {
    isOpen: boolean;
    accountId: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const LevelVerificationModal: React.FC<LevelVerificationModalProps> = ({ isOpen, accountId, onClose, onSuccess }) => {
    const { submitLevelVerification } = useAntiDetectionStore();
    const [claimedLevel, setClaimedLevel] = useState(4);
    const [profileLink, setProfileLink] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setScreenshot(file);
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !screenshot || !profileLink) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('screenshot', screenshot);
            formData.append('gmail_account_id', String(accountId));
            formData.append('profile_link', profileLink);
            formData.append('claimed_level', String(claimedLevel));

            await submitLevelVerification(formData);
            showSuccess('Demande envoyée', 'Votre demande de vérification a été soumise. Un administrateur va la traiter.');
            resetForm();
            onSuccess();
            onClose();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la soumission');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setClaimedLevel(4);
        setProfileLink('');
        setScreenshot(null);
        setPreviewUrl(null);
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '500px',
                    background: 'white',
                    borderRadius: '2rem',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    padding: '2.5rem',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Icon */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '1.25rem', color: '#f59e0b' }}>
                        <Trophy size={32} />
                    </div>
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        Vérifier mon niveau
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 500 }}>
                        Soumettez une capture d'écran de votre profil Local Guide pour faire valider votre niveau.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
                        {/* Level Select */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                                Niveau revendiqué *
                            </label>
                            <select
                                value={claimedLevel}
                                onChange={(e) => setClaimedLevel(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.9rem',
                                    color: '#0f172a',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
                                    <option key={level} value={level}>
                                        Niveau {level} {level >= 4 ? '(Badge Local Guide)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Profile Link */}
                        <Input
                            label="Lien du profil Local Guide *"
                            placeholder="https://www.google.com/maps/contrib/..."
                            value={profileLink}
                            onChange={(e) => setProfileLink(e.target.value)}
                            required
                        />

                        {/* Screenshot Upload */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                                Capture d'écran du niveau *
                            </label>
                            <div
                                onClick={() => document.getElementById('screenshot-input')?.click()}
                                style={{
                                    border: '2px dashed ' + (screenshot ? '#10b981' : '#e2e8f0'),
                                    borderRadius: '1rem',
                                    padding: previewUrl ? '0.5rem' : '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: screenshot ? '#f0fdf4' : '#f8fafc',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Aperçu"
                                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '0.75rem', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <>
                                        <Upload size={28} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                                            Cliquez pour choisir un fichier
                                        </p>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                            JPG, PNG ou WEBP (max 5 Mo)
                                        </p>
                                    </>
                                )}
                            </div>
                            <input
                                id="screenshot-input"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            {screenshot && (
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                                    <ImageIcon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    {screenshot.name}
                                </p>
                            )}
                        </div>

                        {/* Info box */}
                        <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '0.75rem',
                            padding: '0.875rem'
                        }}>
                            <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: 0, lineHeight: '1.4' }}>
                                <strong>Comment faire ?</strong> Rendez-vous sur votre profil Google Local Guide, prenez une capture d'écran montrant clairement votre niveau, puis collez ici le lien de votre profil.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            isLoading={isSubmitting}
                            disabled={!screenshot || !profileLink || isSubmitting}
                            style={{ padding: '1.25rem', borderRadius: '1.25rem', fontSize: '1rem', fontWeight: 800 }}
                        >
                            Soumettre la vérification
                        </Button>
                        <button
                            type="button"
                            onClick={() => { resetForm(); onClose(); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                padding: '0.5rem'
                            }}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
