import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';

interface SubscriptionGateProps {
    children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Only run this check once on mount
        if (hasChecked || !isAuthenticated || user?.role !== 'artisan') {
            return;
        }

        // Allow access to the plan selection page itself to avoid infinite loop
        if (location.pathname === '/artisan/plan') {
            setHasChecked(true);
            return;
        }

        // Allow access if checking payment confirmation
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('session_id') || location.pathname === '/payment/success') {
            setHasChecked(true);
            return;
        }

        const hasActiveStatus = user.subscription_status === 'active' || user.subscription_status === 'trialing';
        const now = new Date();
        // Ensure robust date parsing (handling potential SQL date string formats)
        const endDateStr = user.subscription_end_date?.replace(' ', 'T');
        const isExpired = endDateStr ? new Date(endDateStr) < now : false;

        console.log('--- SUBSCRIPTION GATE DEBUG ---');
        console.log('Path:', location.pathname);
        console.log('Status:', user.subscription_status);
        console.log('End Date:', user.subscription_end_date);
        console.log('Is Expired?', isExpired);
        console.log('Has Active Status?', hasActiveStatus);

        const hasActiveSubscription = hasActiveStatus && !isExpired;

        if (!hasActiveSubscription) {
            console.log('!!! REDIRECTING TO PLAN PAGE - Subscription Requirement Failed !!!');
            navigate('/artisan/plan', { replace: true });
        }

        setHasChecked(true);
    }, [isAuthenticated, user, navigate, location.pathname, hasChecked]);

    // Don't render content if not authenticated or not artisan
    if (!isAuthenticated || user?.role !== 'artisan') {
        return null;
    }

    // Allow access to plan page and payment success
    if (location.pathname === '/artisan/plan' || location.pathname === '/payment/success') {
        return <>{children}</>;
    }

    // Check subscription status
    const queryParams = new URLSearchParams(location.search);
    const hasSessionId = queryParams.get('session_id');

    const isExpired = user?.subscription_end_date && new Date(user.subscription_end_date) < new Date();
    const hasActiveStatus = user?.subscription_status === 'active' || user?.subscription_status === 'trialing';

    if ((!hasActiveStatus || isExpired) && !hasSessionId) {
        return null; // Don't render protected content while redirecting
    }

    return <>{children}</>;
};
