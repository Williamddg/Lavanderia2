import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { HealthStatus, SessionUser } from '@shared/types';
import { api } from './services/api';
import { AppShell } from './ui/layouts/AppShell';
import { SetupPage } from './modules/shared/components/SetupPage';
import { PlaceholderPage } from './modules/shared/components/PlaceholderPage';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { DashboardPage } from './modules/dashboard/pages/DashboardPage';
import { ClientsPage } from './modules/clients/pages/ClientsPage';
import { NewOrderPage } from './modules/orders/pages/NewOrderPage';
import { OrderDetailPage } from './modules/orders/pages/OrderDetailPage';
import { OrdersPage } from './modules/orders/pages/OrdersPage';
import { PaymentsPage } from './modules/payments/pages/PaymentsPage';
import { InvoicesPage } from './modules/invoices/pages/InvoicesPage';
import { InvoiceDetailPage } from './modules/invoices/pages/InvoiceDetailPage';
import { CashPage } from './modules/cash/pages/CashPage';
import { DeliveriesPage } from './modules/deliveries/pages/DeliveriesPage';
import { InventoryPage } from './modules/inventory/pages/InventoryPage';
import { ExpensesPage } from './modules/expenses/pages/ExpensesPage';
import { WarrantiesPage } from './modules/warranties/pages/WarrantiesPage';
import { ReportsPage } from './modules/reports/pages/ReportsPage';
import { WhatsappPage } from './modules/whatsapp/pages/WhatsappPage';
import { SettingsPage } from './modules/settings/pages/SettingsPage';
import { LicensePage } from './modules/license/pages/LicensePage';
import { LicenseRenewalBanner } from './modules/license/components/LicenseRenewalBanner';

export default function App() {
  const [licenseReady, setLicenseReady] = useState(false);
  const [licenseValid, setLicenseValid] = useState(false);
  const [licenseWarning, setLicenseWarning] = useState(false);
  const [licenseDaysLeft, setLicenseDaysLeft] = useState(0);
  const [licenseBusinessName, setLicenseBusinessName] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.health().then(setHealth).finally(() => setLoading(false));

    api.licenseStatus()
      .then((result) => {
        setLicenseValid(Boolean(result?.valid));

        if (result?.valid && result?.warning) {
          setLicenseWarning(true);
          setLicenseDaysLeft(Number(result?.daysLeft ?? 0));
          setLicenseBusinessName(result?.businessName ?? null);
        } else {
          setLicenseWarning(false);
          setLicenseDaysLeft(0);
          setLicenseBusinessName(null);
        }
      })
      .catch(() => {
        setLicenseValid(false);
        setLicenseWarning(false);
        setLicenseDaysLeft(0);
        setLicenseBusinessName(null);
      })
      .finally(() => {
        setLicenseReady(true);
      });
  }, []);

  if (loading) {
    return <div className="center-page">Cargando aplicación...</div>;
  }

  if (!licenseReady) {
    return <div className="center-page">Validando licencia...</div>;
  }

  // Si ya venció o no existe licencia válida, bloquea todo
  if (!licenseValid) {
    return <LicensePage onActivated={() => window.location.reload()} />;
  }

  if (!health?.configured || !health.connected) {
    return <SetupPage />;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <>
      {licenseWarning && licenseDaysLeft > 0 && (
        <LicenseRenewalBanner
          daysLeft={licenseDaysLeft}
          businessName={licenseBusinessName}
        />
      )}

      <Routes>
        <Route element={<AppShell user={user} onLogout={() => setUser(null)} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/ordenes" element={<OrdersPage />} />
          <Route path="/ordenes/nueva" element={<NewOrderPage />} />
          <Route path="/ordenes/:orderId" element={<OrderDetailPage />} />
          <Route path="/pagos" element={<PaymentsPage />} />
          <Route path="/facturacion" element={<InvoicesPage />} />
          <Route path="/facturas/:orderId" element={<InvoiceDetailPage />} />
          <Route path="/caja" element={<CashPage />} />
          <Route path="/entregas" element={<DeliveriesPage />} />
          <Route path="/gastos" element={<ExpensesPage />} />
          <Route path="/garantias" element={<WarrantiesPage />} />
          <Route path="/inventario" element={<InventoryPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/whatsapp" element={<WhatsappPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
          <Route
            path="/auditoria"
            element={
              <PlaceholderPage
                title="Auditoría"
                subtitle="Preparado para exploración de logs y eventos."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}