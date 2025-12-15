import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import useAuthStore from "./stores/authStore";

// Login y páginas de error se cargan inmediatamente
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";

// Lazy loading para todas las demás páginas (code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientForm = lazy(() => import("./pages/ClientForm"));
const ServiceOrders = lazy(() => import("./pages/ServiceOrders"));
const ServiceOrderDetail = lazy(() => import("./pages/ServiceOrderDetail"));
const Services = lazy(() => import("./pages/Services"));
const ClientPricing = lazy(() => import("./pages/ClientPricing"));
const Invoicing = lazy(() => import("./pages/Invoicing"));
const ProviderPayments = lazy(() => import("./pages/ProviderPayments"));
const Users = lazy(() => import("./pages/Users"));
const AccountStatements = lazy(() => import("./pages/AccountStatements"));
const ProviderStatements = lazy(() => import("./pages/ProviderStatements"));
const Catalogs = lazy(() => import("./pages/Catalogs"));
const Profile = lazy(() => import("./pages/Profile"));

// Loading fallback component
function LoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600">Cargando...</p>
            </div>
        </div>
    );
}

function App() {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    if (isCheckingAuth) {
        return <LoadingFallback />;
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    {/* Rutas públicas */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/403" element={<Forbidden />} />

                    {/* Rutas protegidas con RBAC */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="clients" element={<Clients />} />
                        <Route path="clients/new" element={<ClientForm />} />
                        <Route
                            path="clients/:id/edit"
                            element={<ClientForm />}
                        />
                        <Route
                            path="service-orders"
                            element={<ServiceOrders />}
                        />
                        <Route
                            path="service-orders/:id"
                            element={<ServiceOrderDetail />}
                        />
                        <Route path="services" element={<Services />} />
                        <Route
                            path="client-pricing"
                            element={<ClientPricing />}
                        />
                        <Route path="invoicing" element={<Invoicing />} />
                        <Route
                            path="provider-payments"
                            element={<ProviderPayments />}
                        />
                        <Route path="catalogs" element={<Catalogs />} />
                        <Route path="users" element={<Users />} />
                        <Route
                            path="account-statements"
                            element={<AccountStatements />}
                        />
                        <Route
                            path="provider-statements"
                            element={<ProviderStatements />}
                        />
                        <Route path="profile" element={<Profile />} />
                    </Route>
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

export default App;
