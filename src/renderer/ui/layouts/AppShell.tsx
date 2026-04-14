import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { SessionUser } from '@shared/types';

const menu = [
  { to: '/', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/ordenes', label: 'Órdenes' },
  { to: '/entregas', label: 'Entregas' },
  { to: '/facturacion', label: 'Facturación' },
  { to: '/pagos', label: 'Pagos' },
  { to: '/caja', label: 'Caja' },
  { to: '/gastos', label: 'Gastos' },
  { to: '/garantias', label: 'Garantías' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/whatsapp', label: 'WhatsApp' },
  { to: '/configuracion', label: 'Configuración' },
  { to: '/auditoria', label: 'Auditoría' }
];

type AppShellProps = {
  user: SessionUser;
  onLogout: () => void;
};

export const AppShell = ({ user, onLogout }: AppShellProps) => (
  <AppShellContent user={user} onLogout={onLogout} />
);

const AppShellContent = ({ user, onLogout }: AppShellProps) => {
  const location = useLocation();
  const pageContentRef = useRef<HTMLElement | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    pageContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  const currentDate = useMemo(
    () =>
      now.toLocaleDateString('es-CO', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
    [now]
  );

  const currentTime = useMemo(
    () =>
      now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
    [now]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-panel">
          <strong>LavaSuite</strong>
          <span>Lavandería & Sastrería</span>
          <small>Sucursal principal</small>
        </div>

        <nav className="sidebar-nav">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="nav-link"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <strong>{user.displayName}</strong>
          <span>{user.roleName}</span>
          <button
            className="button button-secondary"
            type="button"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <h1>Operación diaria</h1>
            <p>Buscador global, accesos rápidos y estado comercial del escritorio.</p>
          </div>

          <div className="topbar-tools">
            <input
              className="field compact-field"
              placeholder="Buscar cliente, orden o factura"
            />

            <div className="topbar-user">
              <strong>{currentDate}</strong>
              <span>{currentTime}</span>
              <small>{user.displayName}</small>
            </div>
          </div>
        </header>

        <main ref={pageContentRef} className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
