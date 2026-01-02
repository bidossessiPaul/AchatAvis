import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { teamApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, Lock, User, ArrowRight } from 'lucide-react';
import './AcceptInvite.css';

export const AcceptAdminInvite = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error("Lien d'invitation invalide");
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        if (password.length < 8) {
            toast.error("Le mot de passe doit faire au moins 8 caractères");
            return;
        }

        setLoading(true);
        try {
            await teamApi.acceptInvite({
                token: token!,
                password,
                fullName
            });
            toast.success("Compte créé ! Redirection vers la connexion...");
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erreur lors de la création du compte");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="accept-invite-page">
            <div className="invite-container">
                <div className="invite-header">
                    <div className="brand-logo">
                        Achat<span className="brand-highlight">Avis</span>
                        <span className="team-badge">Equipe</span>
                    </div>

                    <h2 className="page-title">
                        Activez votre compte Admin
                    </h2>
                    <p className="page-subtitle">
                        Définissez vos identifiants pour rejoindre l'équipe.
                    </p>
                </div>

                <div className="invite-card">
                    <form className="invite-form" onSubmit={handleSubmit}>
                        <div className="form-field">
                            <label>Nom complet</label>
                            <div className="input-container">
                                <User className="field-icon" size={20} />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="invite-input"
                                    placeholder="Ex: Jean Dupont"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Mot de passe</label>
                            <div className="input-container">
                                <Lock className="field-icon" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="invite-input"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Confirmer le mot de passe</label>
                            <div className="input-container">
                                <Check className="field-icon" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="invite-input"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-activate"
                            >
                                {loading ? 'Activation...' : 'Activer mon compte'}
                                {!loading && <ArrowRight size={16} style={{ marginLeft: '8px' }} />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
