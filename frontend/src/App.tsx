import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/auth/Login';
import { RegisterArtisan } from './pages/auth/RegisterArtisan';
import { RegisterGuide } from './pages/auth/RegisterGuide';
import { ProtectedRoute, PublicRoute } from './components/layout/RouteWrappers';
import './styles/global.css';



import { PlanSelection } from './pages/artisan/PlanSelection';
import PaymentSuccess from './pages/artisan/PaymentSuccess';
import { ProtectedArtisanRoute } from './components/auth/ProtectedArtisanRoute';
import { ArtisanOverview } from './pages/artisan/ArtisanOverview';
import { SubmissionFlow } from './pages/artisan/SubmissionFlow/SubmissionFlow';
import { OrderDetail } from './pages/artisan/OrderDetail';
import { GuideDashboard } from './pages/guide/GuideDashboard';
import { MissionDetail } from './pages/guide/MissionDetail';
import { Submissions } from './pages/guide/Submissions';
import { MyEarnings } from './pages/guide/MyEarnings';
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
import { SubscriptionsList } from './pages/admin/SubscriptionsList';
import { PacksManagement } from './pages/admin/PacksManagement';
import { Profile } from './pages/Profile';
import { useAuthStore } from './context/authStore';

function App() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <BrowserRouter>
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
                <Route path="/guide/missions/:orderId" element={
                    <ProtectedRoute allowedRoles={['guide']}>
                        <MissionDetail />
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

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/admin/artisans" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <ArtisansList />
                    </ProtectedRoute>
                } />
                <Route path="/admin/artisans/:id" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <ArtisanDetail />
                    </ProtectedRoute>
                } />
                <Route path="/admin/guides" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <GuidesList />
                    </ProtectedRoute>
                } />
                <Route path="/admin/guides/:id" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <GuideDetail />
                    </ProtectedRoute>
                } />
                <Route path="/admin/subscriptions" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <SubscriptionsList />
                    </ProtectedRoute>
                } />
                <Route path="/admin/payments" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PaymentsList />
                    </ProtectedRoute>
                } />
                <Route path="/admin/packs" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PacksManagement />
                    </ProtectedRoute>
                } />
                <Route path="/admin/reviews" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <ReviewValidation />
                    </ProtectedRoute>
                } />

                {/* Common Profile Route */}
                <Route path="/profile" element={
                    <ProtectedRoute allowedRoles={['admin', 'artisan', 'guide']}>
                        <Profile />
                    </ProtectedRoute>
                } />

                {/* Catch all redirect */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
