import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Login se carga inmediatamente (página crítica)
import Login from "./pages/Login";

// Lazy loading para todas las demás páginas (code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ServiceOrders = lazy(() => import("./pages/ServiceOrders"));
const ServiceOrderDetail = lazy(() => import("./pages/ServiceOrderDetail"));
const Services = lazy(() => import("./pages/Services"));
const ClientPricing = lazy(() => import("./pages/ClientPricing"));
const Invoicing = lazy(() => import("./pages/Invoicing"));
const Transfers = lazy(() => import("./pages/Transfers"));
const Users = lazy(() => import("./pages/Users"));
const AccountStatements = lazy(() => import("./pages/AccountStatements"));
const Catalogs = lazy(() => import("./pages/Catalogs"));

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
    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/login" element={<Login />} />
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
                        <Route path="transfers" element={<Transfers />} />
                        <Route path="catalogs" element={<Catalogs />} />
                        <Route path="users" element={<Users />} />
                        <Route
                            path="account-statements"
                            element={<AccountStatements />}
                        />
                    </Route>
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

export default App;
