import { NavLink, Outlet } from 'react-router-dom';
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
            <strong>{new Date().toLocaleDateString('es-CO')}</strong>
            <span>{user.displayName}</span>
          </div>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  </div>
);