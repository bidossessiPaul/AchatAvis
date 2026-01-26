import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/auth/Login';
import { RegisterArtisan } from './pages/auth/RegisterArtisan';
import { RegisterGuide } from './pages/auth/RegisterGuide';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { ProtectedRoute, PublicRoute } from './components/layout/RouteWrappers';
import './styles/global.css';



import { PlanSelection } from './pages/artisan/PlanSelection';
import PaymentSuccess from './pages/artisan/PaymentSuccess';
import { ProtectedArtisanRoute } from './components/auth/ProtectedArtisanRoute';
import { PermissionGuard } from './components/auth/PermissionGuard';
import { ArtisanOverview } from './pages/artisan/ArtisanOverview';
import { SubmissionFlow } from './pages/artisan/SubmissionFlow/SubmissionFlow';
import { OrderDetail } from './pages/artisan/OrderDetail';
import { GuideDashboard } from './pages/guide/GuideDashboard';
import { AllFiches } from './pages/guide/AllFiches';
import { FicheDetail } from './pages/guide/FicheDetail';
import { Submissions } from './pages/guide/Submissions';
import { MyEarnings } from './pages/guide/MyEarnings';
import { AntiDetectionRulesPage } from './pages/guide/AntiDetectionRulesPage';
import { QuizCertificationPage } from './pages/guide/QuizCertificationPage';
import { SuspensionStatusPage } from './pages/guide/SuspensionStatusPage';
import { SuspensionBanner } from './components/SuspensionBanner';
import { OrdersList } from './pages/artisan/OrdersList';
import { ReceivedReviews } from './pages/artisan/ReceivedReviews';
import { BillingPage } from './pages/artisan/BillingPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ArtisansList } from './pages/admin/ArtisansList';
import { GuidesList } from './pages/admin/GuidesList';
import { PaymentsList } from './pages/admin/PaymentsList';
import { ArtisanDetail } from './pages/admin/ArtisanDetail';
import { GuideDetail } from './pages/admin/GuideDetail';
import { ReviewValidation } from './pages/admin/ReviewValidation';
import { AdminFiches } from './pages/admin/AdminFiches';
import { AdminFicheDetail } from './pages/admin/AdminFicheDetail';
import { SubscriptionsList } from './pages/admin/SubscriptionsList';
import { PacksManagement } from './pages/admin/PacksManagement';
// import { AdminLogs } from './pages/admin/AdminLogs';
import { AdminTeam } from './pages/admin/AdminTeam';
import { AcceptAdminInvite } from './pages/admin/AcceptAdminInvite';
import { SuspensionAdminPage } from './pages/admin/SuspensionAdminPage';
import { TrustScoreManagement } from './pages/admin/TrustScoreManagement';
import { SectorManagement } from './pages/admin/SectorManagement';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import SuspendedPage from './pages/SuspendedPage';
import { useAuthStore } from './context/authStore';

function App() {
    const { checkAuth } = useAuthStore();

    // Synchronous URL fixing for malformed links (e.g. starting with //)
    // This must happen before the first render to avoid catching the "*" route redirect
    if (window.location.pathname.startsWith('//')) {
        const cleanPath = window.location.pathname.replace(/\/+/g, '/');
        window.location.replace(cleanPath + window.location.search);
        return null;
    }

    useEffect(() => {
        // Initial check
        checkAuth();
    }, [checkAuth]);

    return (
        <BrowserRouter>
            <SuspensionBanner />
            <Toaster position="top-right" reverseOrder={false} />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                <Route path="/login" element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } />
                <Route path="/register/artisan" element={
                    <PublicRoute>
                        <RegisterArtisan />
                    </PublicRoute>
                } />
                <Route path="/register/guide" element={
                    <PublicRoute>
                        <RegisterGuide />
                    </PublicRoute>
                } />
                <Route path="/forgot-password" element={
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                } />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="//reset-password" element={<ResetPassword />} />
                <Route path="/admin/accept-invite" element={
                    <PublicRoute>
                        <AcceptAdminInvite />
                    </PublicRoute>
                } />
                <Route path="/suspended" element={<SuspendedPage />} />

                {/* Protected Routes */}

                {/* Artisan Routes */}
                <Route path="/artisan/plan" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <PlanSelection />
                    </ProtectedRoute>
                } />

                <Route path="/payment/success" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <PaymentSuccess />
                    </ProtectedRoute>
                } />

                {/* All other artisan routes are gated by ProtectedArtisanRoute */}
                <Route path="/artisan/dashboard" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <ArtisanOverview />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <ArtisanOverview />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/submit" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <SubmissionFlow />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/submit/:orderId" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <SubmissionFlow />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/establishments/add" element={<Navigate to="/artisan/dashboard" replace />} />
                <Route path="/artisan/establishments/:id" element={<Navigate to="/artisan/dashboard" replace />} />
                <Route path="/artisan/establishments" element={<Navigate to="/artisan/dashboard" replace />} />

                <Route path="/artisan/order" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <OrdersList />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/orders" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <OrdersList />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/orders/:orderId" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <OrderDetail />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/reviews" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <ReceivedReviews />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />

                <Route path="/artisan/billing" element={
                    <ProtectedRoute allowedRoles={['artisan']}>
                        <ProtectedArtisanRoute>
                            <BillingPage />
                        </ProtectedArtisanRoute>
                    </ProtectedRoute>
                } />


                {/* Guide Routes */}
                <Route path="/guide" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <GuideDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/guide/dashboard" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <GuideDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/guide/fiches" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <AllFiches />
                    </ProtectedRoute>
                } />
                <Route path="/guide/fiches/:orderId" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <FicheDetail />
                    </ProtectedRoute>
                } />
                <Route path="/guide/submissions" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <Submissions />
                    </ProtectedRoute>
                } />
                <Route path="/guide/earnings" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <MyEarnings />
                    </ProtectedRoute>
                } />
                <Route path="/guide/anti-detection" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <AntiDetectionRulesPage />
                    </ProtectedRoute>
                } />
                <Route path="/guide/quiz" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <QuizCertificationPage />
                    </ProtectedRoute>
                } />
                <Route path="/guide/status" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <SuspensionStatusPage />
                    </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="can_view_stats">
                            <AdminDashboard />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/artisans" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                            <ArtisansList />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/artisans/:id" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                            <ArtisanDetail />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/guides" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                            <GuidesList />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/guides/:id" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                            <GuideDetail />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/subscriptions" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="can_view_payments">
                            <SubscriptionsList />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/payments" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="can_view_payments">
                            <PaymentsList />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/packs" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="can_view_payments">
                            <PacksManagement />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/team" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="super_admin">
                            <AdminTeam />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/reviews" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_reviews', 'can_validate_reviews']}>
                            <ReviewValidation />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/fiches" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_fiches', 'can_validate_fiches']}>
                            <AdminFiches />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/fiches/:orderId" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_fiches', 'can_validate_fiches']}>
                            <AdminFicheDetail />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                {/* <Route path="/admin/logs" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="can_view_stats">
                            <AdminLogs />
                        </PermissionGuard>
                    </ProtectedRoute>
                } /> */}

                {/* Common Profile Route */}
                <Route path="/profile" element={
                    <ProtectedRoute allowedRoles={['admin', 'artisan', 'guide']}>
                        <Profile />
                    </ProtectedRoute>
                } />

                <Route path="/admin/suspensions" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission="super_admin">
                            <SuspensionAdminPage />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/trust-scores" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['can_manage_users', 'can_view_stats']}>
                            <TrustScoreManagement />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />
                <Route path="/admin/sectors" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PermissionGuard requiredPermission={['super_admin', 'can_manage_fiches']}>
                            <SectorManagement />
                        </PermissionGuard>
                    </ProtectedRoute>
                } />

                {/* Catch all route - Premium 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
