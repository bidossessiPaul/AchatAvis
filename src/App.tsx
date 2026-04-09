import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute, PublicRoute } from './components/layout/RouteWrappers';
import { ProtectedArtisanRoute } from './components/auth/ProtectedArtisanRoute';
import { PermissionGuard } from './components/auth/PermissionGuard';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { useAuthStore } from './context/authStore';
import './styles/global.css';

const lazyNamed = <T extends Record<string, React.ComponentType<unknown>>>(
    importer: () => Promise<T>,
    exportName: keyof T
) => lazy(() => importer().then((module) => ({ default: module[exportName] })));

const Login = lazyNamed(() => import('./pages/auth/Login'), 'Login');
const ImpersonateLanding = lazyNamed(() => import('./pages/auth/ImpersonateLanding'), 'ImpersonateLanding');
const RegisterArtisan = lazyNamed(() => import('./pages/auth/RegisterArtisan'), 'RegisterArtisan');
const RegisterGuide = lazyNamed(() => import('./pages/auth/RegisterGuide'), 'RegisterGuide');
const ForgotPassword = lazyNamed(() => import('./pages/auth/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyNamed(() => import('./pages/auth/ResetPassword'), 'ResetPassword');

const PlanSelection = lazyNamed(() => import('./pages/artisan/PlanSelection'), 'PlanSelection');
const PaymentSuccess = lazy(() => import('./pages/artisan/PaymentSuccess'));
const ArtisanOverview = lazyNamed(() => import('./pages/artisan/ArtisanOverview'), 'ArtisanOverview');
const SubmissionFlow = lazyNamed(() => import('./pages/artisan/SubmissionFlow/SubmissionFlow'), 'SubmissionFlow');
const OrderDetail = lazyNamed(() => import('./pages/artisan/OrderDetail'), 'OrderDetail');
const OrdersList = lazyNamed(() => import('./pages/artisan/OrdersList'), 'OrdersList');
const ReceivedReviews = lazyNamed(() => import('./pages/artisan/ReceivedReviews'), 'ReceivedReviews');
const BillingPage = lazyNamed(() => import('./pages/artisan/BillingPage'), 'BillingPage');

const GuideDashboard = lazyNamed(() => import('./pages/guide/GuideDashboard'), 'GuideDashboard');
const AllFiches = lazyNamed(() => import('./pages/guide/AllFiches'), 'AllFiches');
const FicheDetail = lazyNamed(() => import('./pages/guide/FicheDetail'), 'FicheDetail');
const Submissions = lazyNamed(() => import('./pages/guide/Submissions'), 'Submissions');
const MyEarnings = lazyNamed(() => import('./pages/guide/MyEarnings'), 'MyEarnings');
const AntiDetectionRulesPage = lazyNamed(() => import('./pages/guide/AntiDetectionRulesPage'), 'AntiDetectionRulesPage');
const QuizCertificationPage = lazyNamed(() => import('./pages/guide/QuizCertificationPage'), 'QuizCertificationPage');
const Corrections = lazyNamed(() => import('./pages/guide/Corrections'), 'Corrections');
const CommunityRulesPage = lazyNamed(() => import('./pages/guide/CommunityRulesPage'), 'CommunityRulesPage');
const MyGmailsPage = lazyNamed(() => import('./pages/guide/MyGmailsPage'), 'MyGmailsPage');

const AdminDashboard = lazyNamed(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const ArtisansList = lazyNamed(() => import('./pages/admin/ArtisansList'), 'ArtisansList');
const GuidesList = lazyNamed(() => import('./pages/admin/GuidesList'), 'GuidesList');
const PaymentsList = lazyNamed(() => import('./pages/admin/PaymentsList'), 'PaymentsList');
const ArtisanDetail = lazyNamed(() => import('./pages/admin/ArtisanDetail'), 'ArtisanDetail');
const GuideDetail = lazyNamed(() => import('./pages/admin/GuideDetail'), 'GuideDetail');
const ReviewValidation = lazyNamed(() => import('./pages/admin/ReviewValidation'), 'ReviewValidation');
const RejectedReviews = lazyNamed(() => import('./pages/admin/RejectedReviews'), 'RejectedReviews');
const ReviewTracking360 = lazyNamed(() => import('./pages/admin/ReviewTracking360'), 'ReviewTracking360');
const AdminFiches = lazyNamed(() => import('./pages/admin/AdminFiches'), 'AdminFiches');
const AdminFicheDetail = lazyNamed(() => import('./pages/admin/AdminFicheDetail'), 'AdminFicheDetail');
const SubscriptionsList = lazyNamed(() => import('./pages/admin/SubscriptionsList'), 'SubscriptionsList');
const PacksManagement = lazyNamed(() => import('./pages/admin/PacksManagement'), 'PacksManagement');
const AdminTeam = lazyNamed(() => import('./pages/admin/AdminTeam'), 'AdminTeam');
const AcceptAdminInvite = lazyNamed(() => import('./pages/admin/AcceptAdminInvite'), 'AcceptAdminInvite');
const TrustScoreManagement = lazyNamed(() => import('./pages/admin/TrustScoreManagement'), 'TrustScoreManagement');
const SectorManagement = lazyNamed(() => import('./pages/admin/SectorManagement'), 'SectorManagement');
const AdminLevelVerifications = lazyNamed(() => import('./pages/admin/AdminLevelVerifications'), 'AdminLevelVerifications');
const GuidesBalances = lazyNamed(() => import('./pages/admin/GuidesBalances'), 'GuidesBalances');
const GmailAccountsList = lazyNamed(() => import('./pages/admin/GmailAccountsList'), 'GmailAccountsList');

const Profile = lazyNamed(() => import('./pages/Profile'), 'Profile');
const NotFound = lazyNamed(() => import('./pages/NotFound'), 'NotFound');

const MaintenanceRedirect: React.FC = () => {
    const navigate = useNavigate();
    useEffect(() => {
        toast('Cette page est en cours de modification pour le moment.', { icon: '🚧', duration: 4000 });
        navigate('/guide/dashboard', { replace: true });
    }, [navigate]);
    return null;
};

function App() {
    const { checkAuth, user } = useAuthStore();
    const hasHydratedUserRef = useRef(Boolean(user));

    useEffect(() => {
        checkAuth(hasHydratedUserRef.current);
    }, [checkAuth]);

    // Synchronous URL fixing for malformed links (e.g. starting with //)
    // This must happen before the first render to avoid catching the "*" route redirect
    if (window.location.pathname.startsWith('//')) {
        const cleanPath = window.location.pathname.replace(/\/+/g, '/');
        window.location.replace(cleanPath + window.location.search);
        return null;
    }

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Toaster position="top-right" reverseOrder={false} />
                <Suspense fallback={<LoadingOverlay text="Chargement de la page..." />}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            }
                        />
                        <Route path="/auth/impersonate" element={<ImpersonateLanding />} />
                        <Route
                            path="/register/artisan"
                            element={
                                <PublicRoute>
                                    <RegisterArtisan />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/register/guide"
                            element={
                                <PublicRoute>
                                    <RegisterGuide />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/forgot-password"
                            element={
                                <PublicRoute>
                                    <ForgotPassword />
                                </PublicRoute>
                            }
                        />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="//reset-password" element={<ResetPassword />} />
                        <Route
                            path="/admin/accept-invite"
                            element={
                                <PublicRoute>
                                    <AcceptAdminInvite />
                                </PublicRoute>
                            }
                        />

                        {/* Artisan Routes */}
                        <Route
                            path="/artisan/plan"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <PlanSelection />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/payment/success"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <PaymentSuccess />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <ArtisanOverview />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <ArtisanOverview />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/submit"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <SubmissionFlow />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/submit/:orderId"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <SubmissionFlow />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/artisan/establishments/add" element={<Navigate to="/artisan/dashboard" replace />} />
                        <Route path="/artisan/establishments/:id" element={<Navigate to="/artisan/dashboard" replace />} />
                        <Route path="/artisan/establishments" element={<Navigate to="/artisan/dashboard" replace />} />

                        <Route
                            path="/artisan/order"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <OrdersList />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/orders"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <OrdersList />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/orders/:orderId"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <OrderDetail />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/reviews"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <ReceivedReviews />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/artisan/billing"
                            element={
                                <ProtectedRoute allowedRoles={['artisan']}>
                                    <ProtectedArtisanRoute>
                                        <BillingPage />
                                    </ProtectedArtisanRoute>
                                </ProtectedRoute>
                            }
                        />

                        {/* Guide Routes */}
                        <Route
                            path="/guide"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <GuideDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <GuideDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/fiches"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <AllFiches />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/fiches/:orderId"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <FicheDetail />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/submissions"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <Submissions />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/corrections"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <Corrections />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/earnings"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <MyEarnings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/anti-detection"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <AntiDetectionRulesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/community-rules"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <CommunityRulesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/my-gmails"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <MaintenanceRedirect />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guide/quiz"
                            element={
                                <ProtectedRoute allowedRoles={['guide']}>
                                    <QuizCertificationPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_view_stats">
                                        <AdminDashboard />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/artisans"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                                        <ArtisansList />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/artisans/:id"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                                        <ArtisanDetail />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/guides"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                                        <GuidesList />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/guides/:id"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                                        <GuideDetail />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/subscriptions"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_view_payments">
                                        <SubscriptionsList />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/payments"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_view_payments">
                                        <PaymentsList />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/packs"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_manage_packs">
                                        <PacksManagement />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/team"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_manage_team">
                                        <AdminTeam />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/reviews"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_reviews', 'can_validate_reviews']}>
                                        <ReviewValidation />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/rejected-reviews"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_reviews', 'can_validate_reviews']}>
                                        <RejectedReviews />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/reviews-360"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_reviews', 'can_validate_reviews']}>
                                        <ReviewTracking360 />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/level-verifications"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                                        <AdminLevelVerifications />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/fiches"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_fiches', 'can_validate_fiches']}>
                                        <AdminFiches />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/fiches/:orderId"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_fiches', 'can_validate_fiches']}>
                                        <AdminFicheDetail />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />

                        {/* Common Profile Route */}
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute allowedRoles={['admin', 'artisan', 'guide']}>
                                    <Profile />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/admin/trust-scores"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_manage_trust_scores">
                                        <TrustScoreManagement />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/sectors"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_manage_sectors">
                                        <SectorManagement />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/guides-balances"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission="can_view_payments">
                                        <GuidesBalances />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/gmail-accounts"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <PermissionGuard requiredPermission={['can_manage_users', 'can_validate_profiles']}>
                                        <GmailAccountsList />
                                    </PermissionGuard>
                                </ProtectedRoute>
                            }
                        />

                        {/* Catch all route - Premium 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
