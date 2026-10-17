import { Navigate, Route, Routes } from 'react-router';
import AuthProvider from './auth/AuthProvider.jsx';
import { RequireAuth, RequireGuest } from './auth/RouteGuards.jsx';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InvoiceDetailPage from './pages/InvoiceDetailPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NewInvoicePage from './pages/NewInvoicePage.jsx';
import NewPurchaseOrderPage from './pages/NewPurchaseOrderPage.jsx';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="purchase-orders/new" element={<NewPurchaseOrderPage />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<NewInvoicePage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireGuest />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
