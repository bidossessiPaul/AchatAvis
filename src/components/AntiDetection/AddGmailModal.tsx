import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Info } from 'lucide-react';
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
    const { verifyGmailPreview, addGmailAccount } = useAntiDetectionStore();

    const [formData, setFormData] = useState({
        email: '',
        mapsProfileUrl: ''
    });

    const [previewData, setPreviewData] = useState<any>(null);
    const [trustScoreData, setTrustScoreData] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
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
                trust_score_value: 100, // Default to 100 as we don't verify anymore
                trust_level: 'BRONZE',
                trust_badge: '🛡️ BRONZE',
                max_reviews_per_month: 20, // Default safe quota
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
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '500px',
                    background: 'white',
                    borderRadius: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }}
            >
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Ajouter un compte Gmail</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }} className="light-theme-form">
                    <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        <Input
                            label="Adresse Gmail"
                            type="email"
                            placeholder="exemple@gmail.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />

                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <label className="input-label" style={{ margin: 0 }}>Lien Profil Local Guide Google (Optionnel)</label>
                                <div
                                    style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'help' }}
                                    className="info-bubble-trigger"
                                >
                                    <Info size={16} color="#0ea5e9" />
                                    <div className="info-bubble-content">
                                        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>Où trouver ce lien ?</div>
                                        <ol style={{ paddingLeft: '1.25rem', margin: 0, color: '#f1f5f9', listStyleType: 'decimal' }}>
                                            <li>Ouvrez <b>Google Maps</b></li>
                                            <li>Cliquez sur votre <b>Avatar</b></li>
                                            <li>Allez dans <b>"Vos contributions"</b></li>
                                            <li>Cliquez sur <b>"Afficher votre profil"</b></li>
                                            <li>Copiez l'URL de cette page</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                            <Input
                                placeholder="https://www.google.com/maps/contrib/..."
                                value={formData.mapsProfileUrl}
                                onChange={(e) => setFormData({ ...formData, mapsProfileUrl: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
                        Enregistrer le compte
                    </Button>
                </form>
            </motion.div>
        </div>
    );
};
