// Remplace les liens cliquables vers Google par un bouton copier.
// Évite que Google détecte la provenance du clic depuis AchatAvis.
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string | null | undefined;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md';
}

export default function CopyLinkButton({ url, label, className, style, size = 'md' }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sm = size === 'sm';

  return (
    <button
      type="button"
      onClick={copy}
      className={className}
      title={url}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sm ? '4px' : '6px',
        padding: sm ? '0.3rem 0.6rem' : '0.4rem 0.8rem',
        background: copied ? '#dcfce7' : '#f8fafc',
        border: `1px solid ${copied ? '#86efac' : '#e2e8f0'}`,
        borderRadius: '8px',
        color: copied ? '#166534' : 'var(--primary-brand, #2383e2)',
        fontSize: sm ? '0.75rem' : '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        ...style
      }}
    >
      {copied ? <Check size={sm ? 12 : 14} /> : <Copy size={sm ? 12 : 14} />}
      {copied ? 'Copié !' : (label ?? 'Copier le lien')}
    </button>
  );
}
