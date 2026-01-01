import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export function ProtectedArtisanRoute({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        const check = async () => {
            console.log('🔍 Vérification accès artisan...');

            try {
                // Cette route a été mise à jour pour être accessible sans middleware d'abonnement
                const response = await api.get('/artisan/profile');
                const profile = response.data;

                console.log('📊 Profil reçu:', profile);

                const isActive =
                    profile.subscription_status === 'active' &&
                    profile.subscription_end_date &&
                    new Date(profile.subscription_end_date) > new Date();

                console.log('✅ Abonnement actif:', isActive);

                // We no longer redirect to /artisan/plan here. 
                // The dashboard (ArtisanOverview) will handle the display of subscription CTA.
                setHasAccess(true);

            } catch (error: any) {
                console.error('❌ Erreur vérification:', error);
                if (error.response?.status === 401) {
                    navigate('/login');
                } else {
                    // Si erreur autre que 401, on laisse passer quand même 
                    // (l'utilisateur est authentifié au niveau global)
                    setHasAccess(true);
                }
            } finally {
                setIsChecking(false);
            }
        };

        check();
    }, []); // Only check once on mount

    if (isChecking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-yellow-500" />
            </div>
        );
    }

    return hasAccess ? <>{children}</> : null;
}
