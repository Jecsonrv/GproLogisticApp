import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ServiceOrders from "./pages/ServiceOrders";
import ServiceOrderDetail from "./pages/ServiceOrderDetail";
import Services from "./pages/Services";
import ClientPricing from "./pages/ClientPricing";
import Invoicing from "./pages/Invoicing";
import Transfers from "./pages/Transfers";
import Users from "./pages/Users";
import AccountStatements from "./pages/AccountStatements";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
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
                <Route path="service-orders" element={<ServiceOrders />} />
                <Route
                    path="service-orders/:id"
                    element={<ServiceOrderDetail />}
                />
                <Route path="services" element={<Services />} />
                <Route path="client-pricing" element={<ClientPricing />} />
                <Route path="invoicing" element={<Invoicing />} />
                <Route path="transfers" element={<Transfers />} />
                <Route path="users" element={<Users />} />
                <Route
                    path="account-statements"
                    element={<AccountStatements />}
                />
            </Route>
        </Routes>
    );
}

export default App;