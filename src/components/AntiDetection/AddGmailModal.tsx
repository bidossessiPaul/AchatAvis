import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { showSuccess, showError } from '../../utils/Swal';

interface AddGmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddGmailModal: React.FC<AddGmailModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuthStore();
    const { addGmailAccount } = useAntiDetectionStore();

    const [formData, setFormData] = useState({
        email: '',
        mapsProfileUrl: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        try {
            await addGmailAccount({
                user_id: user.id,
                email: formData.email,
                maps_profile_url: formData.mapsProfileUrl,
                local_guide_level: 1,
                total_reviews_google: 0,
                // These will be auto-calculated or set to default in the backend
                trust_level: 'BRONZE',
                is_blocked: false
            });

            showSuccess('Succès', 'Compte Gmail ajouté avec succès!');
            setFormData({ email: '', mapsProfileUrl: '' });
            onSuccess();
            onClose();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de l’ajout du compte');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
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
                    maxWidth: '460px',
                    background: 'white',
                    borderRadius: '2rem',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    padding: '2.5rem'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '1.25rem', color: '#0ea5e9' }}>
                        <Mail size={32} />
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Nouveau Compte Gmail</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 500 }}>
                        Ajoutez un compte pour augmenter vos quotas mensuels.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
                        <Input
                            label="Adresse Gmail"
                            type="email"
                            placeholder="votre.nom@gmail.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />

                        <Input
                            label="Lien Profil Google Maps (Optionnel)"
                            placeholder="https://www.google.com/maps/contrib/..."
                            value={formData.mapsProfileUrl}
                            onChange={(e) => setFormData({ ...formData, mapsProfileUrl: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} style={{ padding: '1.25rem', borderRadius: '1.25rem', fontSize: '1rem', fontWeight: 800 }}>
                            Enregistrer le compte
                        </Button>
                        <button
                            type="button"
                            onClick={onClose}
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
