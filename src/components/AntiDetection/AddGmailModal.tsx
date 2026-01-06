import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Search, CheckCircle2, Award, User, Info } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import toast from 'react-hot-toast';

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
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Unified verification logic
    const performVerification = async () => {
        if (!formData.email) return null;
        setIsVerifying(true);
        try {
            const data = await verifyGmailPreview(formData.email, formData.mapsProfileUrl);
            setPreviewData(data);
            return data;
        } catch (error) {
            console.error('Verification failed');
            return null;
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerify = async () => {
        await performVerification();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        try {
            // Force verification if not done yet
            let finalPreview = previewData;
            if (!finalPreview) {
                finalPreview = await performVerification();
            }

            await addGmailAccount({
                user_id: user.id,
                email: formData.email,
                maps_profile_url: formData.mapsProfileUrl,
                local_guide_level: finalPreview?.localGuideLevel || 1,
                total_reviews_google: finalPreview?.reviewCount || 0,
                avatar_url: finalPreview?.avatarUrl
            });
            toast.success('Compte Gmail ajouté avec succès');
            setFormData({ email: '', mapsProfileUrl: '' });
            setPreviewData(null);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erreur lors de l’ajout du compte');
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
                            onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value });
                                setPreviewData(null); // Force re-verification
                            }}
                            required
                        />

                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <label className="input-label" style={{ margin: 0 }}>Lien Profil Google Maps (Optionnel)</label>
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
                                onChange={(e) => {
                                    setFormData({ ...formData, mapsProfileUrl: e.target.value });
                                    setPreviewData(null); // Force re-verification
                                }}
                            />
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleVerify}
                            isLoading={isVerifying}
                            disabled={!formData.email}
                            fullWidth
                        >
                            <Search size={18} style={{ marginRight: '8px' }} />
                            Lancer la vérification
                        </Button>
                    </div>

                    <AnimatePresence>
                        {previewData && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                style={{
                                    background: '#f8fafc',
                                    padding: '1.25rem',
                                    borderRadius: '1rem',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '1.5rem'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        {previewData.avatarUrl ? (
                                            <img src={previewData.avatarUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid white' }} />
                                        ) : (
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={24} color="#94a3b8" />
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: '2px' }}>
                                            <CheckCircle2 size={14} color="#10b981" fill="#fff" />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Profil Identifié</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Score de confiance : {previewData.trustScore}%</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Niveau</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#0f172a' }}>
                                            <Award size={14} color="#f59e0b" />
                                            {previewData.localGuideLevel || 1}
                                        </div>
                                    </div>
                                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Confiance</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#0ea5e9' }}>
                                            <Shield size={14} />
                                            {previewData.trustLevel}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
                        Enregistrer le compte
                    </Button>
                </form>
            </motion.div>
        </div>
    );
};
