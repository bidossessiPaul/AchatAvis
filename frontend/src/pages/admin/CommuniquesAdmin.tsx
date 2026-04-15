import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Megaphone, Plus, Edit2, Trash2, Send, Eye, EyeOff, X, Save, ShieldCheck,
    FileText, AlertTriangle, BookOpen, Info, Award, Bell
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface Communique {
    id: string;
    title: string;
    subtitle: string | null;
    date_label: string | null;
    icon: string;
    accent_color: string;
    content: string;
    is_published: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

const ICON_OPTIONS = [
    { key: 'Megaphone', label: '📢 Annonce', icon: <Megaphone size={18} /> },
    { key: 'ShieldCheck', label: '🛡️ Sécurité', icon: <ShieldCheck size={18} /> },
    { key: 'FileText', label: '📄 Document', icon: <FileText size={18} /> },
    { key: 'AlertTriangle', label: '⚠️ Alerte', icon: <AlertTriangle size={18} /> },
    { key: 'BookOpen', label: '📖 Règles', icon: <BookOpen size={18} /> },
    { key: 'Info', label: 'ℹ️ Info', icon: <Info size={18} /> },
    { key: 'Award', label: '🏆 Récompense', icon: <Award size={18} /> },
    { key: 'Bell', label: '🔔 Notification', icon: <Bell size={18} /> },
];

const COLOR_OPTIONS = [
    { key: '#0369a1', label: 'Bleu' },
    { key: '#047857', label: 'Vert' },
    { key: '#dc2626', label: 'Rouge' },
    { key: '#d97706', label: 'Orange' },
    { key: '#7c3aed', label: 'Violet' },
    { key: '#0f172a', label: 'Noir' },
];

const emptyForm = (): Partial<Communique> & { notify_guides?: boolean } => ({
    title: '',
    subtitle: '',
    date_label: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    icon: 'Megaphone',
    accent_color: '#0369a1',
    content: '',
    is_published: 1,
    sort_order: 0,
    notify_guides: true,
});

export const CommuniquesAdmin: React.FC = () => {
    const [items, setItems] = useState<Communique[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<any>(emptyForm());

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listCommuniques();
            setItems(data);
        } catch {
            showError('Erreur', 'Chargement impossible');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleNew = () => {
        setEditing(null);
        setForm(emptyForm());
        setShowForm(true);
    };

    const handleEdit = (item: Communique) => {
        setEditing(item.id);
        setForm({
            title: item.title,
            subtitle: item.subtitle || '',
            date_label: item.date_label || '',
            icon: item.icon,
            accent_color: item.accent_color,
            content: item.content,
            is_published: item.is_published,
            sort_order: item.sort_order,
            notify_guides: false, // Don't re-notify on edit by default
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title?.trim() || !form.content?.trim()) {
            showError('Champs manquants', 'Titre et contenu sont obligatoires');
            return;
        }

        try {
            if (editing) {
                await adminApi.updateCommunique(editing, form);
                showSuccess('Enregistré', 'Communiqué mis à jour');
            } else {
                await adminApi.createCommunique(form);
                showSuccess(
                    'Publié',
                    form.notify_guides
                        ? 'Communiqué créé — email envoyé à tous les guides en arrière-plan'
                        : 'Communiqué créé'
                );
            }
            setShowForm(false);
            load();
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Sauvegarde impossible');
        }
    };

    const handleDelete = async (item: Communique) => {
        const r = await showConfirm(
            'Supprimer ce communiqué ?',
            `« ${item.title} » sera définitivement supprimé.`
        );
        if (!r.isConfirmed) return;
        try {
            await adminApi.deleteCommunique(item.id);
            showSuccess('Supprimé', 'Communiqué retiré');
            load();
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Suppression impossible');
        }
    };

    const handleTogglePublish = async (item: Communique) => {
        try {
            await adminApi.updateCommunique(item.id, { is_published: !item.is_published });
            load();
        } catch {
            showError('Erreur', 'Action impossible');
        }
    };

    const handleResendNotification = async (item: Communique) => {
        const r = await showConfirm(
            'Renvoyer l\'email ?',
            `Un email sera envoyé à tous les guides à propos de « ${item.title} ».`
        );
        if (!r.isConfirmed) return;
        try {
            await adminApi.notifyCommunique(item.id);
            showSuccess('Envoi lancé', 'Les emails partent en arrière-plan');
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Action impossible');
        }
    };

    const iconFor = (key: string) => ICON_OPTIONS.find(o => o.key === key)?.icon || <Megaphone size={18} />;

    return (
        <DashboardLayout title="Communiqués">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Megaphone size={24} style={{ color: '#0369a1' }} />
                            <h2 className="card-title">Communiqués officiels</h2>
                        </div>
                        <button onClick={handleNew} className="admin-btn-primary">
                            <Plus size={18} /> Nouveau communiqué
                        </button>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                Aucun communiqué. Cliquez sur « Nouveau communiqué » pour en créer un.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem', padding: '1rem 0' }}>
                                {items.map(item => (
                                    <div key={item.id} style={{
                                        border: '1px solid #e2e8f0',
                                        borderLeft: `4px solid ${item.accent_color}`,
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        background: 'white',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: '1rem',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '10px',
                                                    background: `${item.accent_color}15`,
                                                    color: item.accent_color,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {iconFor(item.icon)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{item.title}</div>
                                                    {item.subtitle && (
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.subtitle}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
                                                {item.date_label && <span>📅 {item.date_label}</span>}
                                                <span>
                                                    {item.is_published
                                                        ? <span style={{ color: '#059669' }}>● Publié</span>
                                                        : <span style={{ color: '#94a3b8' }}>○ Brouillon</span>
                                                    }
                                                </span>
                                                <span>Créé : {new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => handleTogglePublish(item)}
                                                title={item.is_published ? 'Dépublier' : 'Publier'}
                                                style={iconBtnStyle('#64748b')}
                                            >
                                                {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleResendNotification(item)}
                                                title="Renvoyer l'email"
                                                style={iconBtnStyle('#0369a1')}
                                            >
                                                <Send size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                title="Modifier"
                                                style={iconBtnStyle('#0369a1')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                title="Supprimer"
                                                style={iconBtnStyle('#dc2626')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Form modal */}
            {showForm && (
                <div
                    onClick={() => setShowForm(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: '16px', maxWidth: '800px', width: '100%',
                            maxHeight: '90vh', overflow: 'auto', padding: '1.75rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
                                {editing ? 'Modifier le communiqué' : 'Nouveau communiqué'}
                            </h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Field label="Titre *">
                                <input
                                    type="text"
                                    value={form.title || ''}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Vérification d'identité obligatoire"
                                />
                            </Field>
                            <Field label="Sous-titre">
                                <input
                                    type="text"
                                    value={form.subtitle || ''}
                                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Sécurité des comptes Guides Locaux"
                                />
                            </Field>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Field label="Date affichée">
                                    <input
                                        type="text"
                                        value={form.date_label || ''}
                                        onChange={(e) => setForm({ ...form, date_label: e.target.value })}
                                        style={inputStyle}
                                        placeholder="Avril 2026"
                                    />
                                </Field>
                                <Field label="Ordre d'affichage">
                                    <input
                                        type="number"
                                        value={form.sort_order ?? 0}
                                        onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                                        style={inputStyle}
                                    />
                                </Field>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Field label="Icône">
                                    <select
                                        value={form.icon}
                                        onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                        style={inputStyle}
                                    >
                                        {ICON_OPTIONS.map(o => (
                                            <option key={o.key} value={o.key}>{o.label}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Couleur d'accent">
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {COLOR_OPTIONS.map(c => (
                                            <button
                                                key={c.key}
                                                type="button"
                                                onClick={() => setForm({ ...form, accent_color: c.key })}
                                                title={c.label}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: c.key,
                                                    border: form.accent_color === c.key ? '3px solid #0f172a' : '1px solid #e2e8f0',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </Field>
                            </div>
                            <Field label="Contenu (HTML accepté) *">
                                <textarea
                                    value={form.content || ''}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    rows={14}
                                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}
                                    placeholder={`<p>Chers Guides Locaux,</p>\n<p>Voici notre nouveau communiqué...</p>\n<ul>\n  <li>Point 1</li>\n  <li>Point 2</li>\n</ul>\n<p><strong>Important :</strong> ...</p>`}
                                />
                                <small style={{ color: '#64748b' }}>
                                    Balises HTML autorisées : &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;h3&gt;, &lt;a&gt;, &lt;br&gt;, &lt;div&gt;
                                </small>
                            </Field>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!form.is_published}
                                        onChange={(e) => setForm({ ...form, is_published: e.target.checked ? 1 : 0 })}
                                    />
                                    <span>Publier immédiatement</span>
                                </label>
                                {!editing && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!form.notify_guides}
                                            onChange={(e) => setForm({ ...form, notify_guides: e.target.checked })}
                                        />
                                        <span>📧 Envoyer email à tous les guides</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowForm(false)} className="btn-secondary">
                                Annuler
                            </button>
                            <button onClick={handleSave} className="admin-btn-primary">
                                <Save size={18} /> {editing ? 'Mettre à jour' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            {label}
        </label>
        {children}
    </div>
);

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
};

const iconBtnStyle = (color: string): React.CSSProperties => ({
    width: '34px', height: '34px', borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
});

export default CommuniquesAdmin;
