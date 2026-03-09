import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const ImpersonateLanding: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const role = searchParams.get('role');

        if (!token) {
            navigate('/login');
            return;
        }

        // Store the impersonation token (overrides any existing session in this tab)
        localStorage.setItem('accessToken', token);

        // Clear persisted auth store so it re-reads from the new token
        localStorage.removeItem('auth-storage');

        // Redirect based on role
        if (role === 'guide') {
            window.location.href = '/guide/dashboard';
        } else {
            window.location.href = '/artisan/dashboard';
        }
    }, [searchParams, navigate]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'sans-serif',
            color: '#6b7280',
        }}>
            Connexion en cours...
        </div>
    );
};
