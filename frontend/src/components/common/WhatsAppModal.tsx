import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import { authApi } from '../../services/api';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Smartphone, ExternalLink, CheckCircle2, MessageSquare } from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';

export const WhatsAppModal: React.FC = () => {
    const { user, setUser } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasTested, setHasTested] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        // Condition to show modal: whatsapp_number is missing and user is not admin
        const isGuideMissing = user.role === 'guide' && !user.whatsapp_number;
        const isArtisanMissing = user.role === 'artisan' && !user.whatsapp_number;

        if (isGuideMissing || isArtisanMissing) {
            setIsOpen(true);
        }
    }, [user]);

    const handleTestLink = () => {
        if (!whatsappNumber || whatsappNumber.length < 10) {
            setError('Veuillez entrer un numéro valide (ex: +336...)');
            return;
        }

        // Clean number: remove spaces, +, etc. for the wa.me link
        const cleanNumber = whatsappNumber.replace(/\D/g, '');
        const whatsappLink = `https://wa.me/${cleanNumber}`;

        window.open(whatsappLink, '_blank');
        setHasTested(true);
        setError(null);
    };

    const handleSave = async () => {
        if (!hasTested) {
            setError('Veuillez tester le lien WhatsApp avant d\'enregistrer.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await authApi.updateProfile({ whatsappNumber });
            const updatedUser = { ...user, ...response.user };
            setUser(updatedUser as any);
            setIsOpen(false);
            showSuccess('Profil mis à jour', 'Votre numéro WhatsApp a été enregistré avec succès.');
        } catch (err: any) {
            showError('Erreur', 'Impossible de mettre à jour votre profil.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        // Guides cannot close the modal permanently if it's missing
        if (user?.role === 'guide') {
            setIsOpen(false);
            // It will reappear on next page load/mount because of useEffect
        } else {
            setIsOpen(false);
        }
    };

    if (!isOpen || !user) return null;

    const isGuide = user.role === 'guide';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="📞 Numéro WhatsApp Requis"
            showCloseButton={!isGuide} // Guide must fill it
        >
            <div style={{ padding: '1rem' }}>
                <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    {isGuide ? (
                        "En tant que Guide, vous devez impérativement ajouter votre numéro WhatsApp pour recevoir vos missions et être payé."
                    ) : (
                        "Pour un meilleur suivi de vos campagnes, veuillez ajouter votre numéro WhatsApp."
                    )}
                </p>

                <div className="whatsapp-notice" style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                }}>
                    <MessageSquare size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.85rem', color: '#166534', margin: 0 }}>
                        Nous formons automatiquement le lien WhatsApp pour vous. Vous devez cliquer sur "Tester le lien" pour vérifier qu'il redirige bien vers votre compte.
                    </p>
                </div>

                <Input
                    type="tel"
                    label="Numéro WhatsApp"
                    placeholder="+33612345678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    icon={<Smartphone size={18} />}
                    helperText="Incluez l'indicatif pays (ex: +33 pour la France)"
                />

                {error && (
                    <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleTestLink}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <ExternalLink size={16} />
                        Tester le lien WhatsApp
                    </Button>

                    <Button
                        variant="primary"
                        fullWidth
                        onClick={handleSave}
                        disabled={!hasTested || !whatsappNumber || isSaving}
                        isLoading={isSaving}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {hasTested ? <CheckCircle2 size={16} /> : null}
                        Confirmer et Enregistrer
                    </Button>

                    {!isGuide && (
                        <button
                            onClick={handleClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#6b7280',
                                fontSize: '0.85rem',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                marginTop: '0.5rem'
                            }}
                        >
                            Plus tard
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
