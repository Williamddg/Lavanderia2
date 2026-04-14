import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { HealthStatus, InstallStep, LocalInstallInput } from '@shared/types';
import { api } from '@renderer/services/api';
import { Button, Input } from '@renderer/ui/components';

type Props = {
  onCompleted: (health: HealthStatus) => void;
};

const initialState: LocalInstallInput = {
  host: '127.0.0.1',
  port: 3306,
  adminUser: 'root',
  adminPassword: '',
  database: 'lavanderia',
  appDbUser: 'lavapp_local',
  appDbPassword: '',
  ssl: false
};

const plannedSteps: InstallStep[] = [
  { key: 'connect-admin', label: 'Conectando a MySQL con usuario administrador', status: 'pending' },
  { key: 'create-database', label: 'Creando o validando la base de datos local', status: 'pending' },
  { key: 'create-db-user', label: 'Creando el usuario interno de la aplicación', status: 'pending' },
  { key: 'save-config', label: 'Guardando la configuración interna de la app', status: 'pending' },
  { key: 'run-migrations', label: 'Creando tablas y estructura inicial', status: 'pending' },
  { key: 'verify-health', label: 'Validando la instalación local', status: 'pending' },
  { key: 'ready', label: 'Iniciando la aplicación', status: 'pending' }
];

export const SetupPage = ({ onCompleted }: Props) => {
  const [form, setForm] = useState(initialState);
  const [visibleSteps, setVisibleSteps] = useState<InstallStep[]>(plannedSteps);
  const [simulatedIndex, setSimulatedIndex] = useState(0);
  const [appDbPasswordConfirm, setAppDbPasswordConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: api.bootstrapLocalInstall,
    onSuccess: (result) => {
      setVisibleSteps(result.steps);
    }
  });

  useEffect(() => {
    if (!mutation.isPending) return;

    setVisibleSteps(plannedSteps);
    setSimulatedIndex(0);

    const interval = window.setInterval(() => {
      setSimulatedIndex((current) => Math.min(current + 1, plannedSteps.length - 1));
    }, 900);

    return () => window.clearInterval(interval);
  }, [mutation.isPending]);

  const displayedSteps = useMemo(() => {
    if (!mutation.isPending) {
      return visibleSteps;
    }

    return plannedSteps.map((step, index) => ({
      ...step,
      status: index < simulatedIndex ? 'success' : 'pending'
    }));
  }, [mutation.isPending, simulatedIndex, visibleSteps]);

  const validationError = useMemo(() => {
    if (!form.host.trim()) return 'Debes indicar el host de MySQL.';
    if (!form.adminUser.trim()) return 'Debes indicar el usuario administrador de MySQL.';
    if (!form.database.trim()) return 'Debes indicar el nombre de la base de datos.';
    if (!form.appDbUser.trim()) return 'Debes indicar el usuario interno de la aplicación.';
    if (form.appDbPassword.length < 12) {
      return 'La contraseña interna de MySQL debe tener al menos 12 caracteres.';
    }
    if (
      !/[A-Z]/.test(form.appDbPassword) ||
      !/[a-z]/.test(form.appDbPassword) ||
      !/\d/.test(form.appDbPassword)
    ) {
      return 'La contraseña interna de MySQL debe incluir mayúscula, minúscula y número.';
    }
    if (form.appDbPassword !== appDbPasswordConfirm) {
      return 'La confirmación de la contraseña interna de MySQL no coincide.';
    }

    return '';
  }, [appDbPasswordConfirm, form]);

  return (
    <div className="auth-screen">
      <div className="setup-card-large stack-gap">
        <span className="eyebrow">Instalación local</span>
        <h2>Preparar MySQL para esta instalación</h2>
        <p>
          Primero valida acceso de administrador a MySQL. Luego la app creará la base de datos,
          el usuario interno que definas y dejará la estructura lista para configurar los usuarios del sistema.
        </p>

        <div className="form-grid">
          <label>
            <span>Host</span>
            <Input
              value={form.host}
              onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
            />
          </label>

          <label>
            <span>Puerto</span>
            <Input
              type="number"
              value={form.port}
              onChange={(e) => setForm((prev) => ({ ...prev, port: Number(e.target.value) }))}
            />
          </label>

          <label>
            <span>Usuario administrador MySQL</span>
            <Input
              value={form.adminUser}
              onChange={(e) => setForm((prev) => ({ ...prev, adminUser: e.target.value }))}
            />
          </label>

          <label>
            <span>Contraseña administrador MySQL</span>
            <Input
              type="password"
              value={form.adminPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
            />
          </label>

          <label className="full-span">
            <span>Nombre de la base de datos</span>
            <Input
              value={form.database}
              onChange={(e) => setForm((prev) => ({ ...prev, database: e.target.value }))}
            />
          </label>

          <label>
            <span>Usuario interno MySQL para la app</span>
            <Input
              value={form.appDbUser}
              onChange={(e) => setForm((prev) => ({ ...prev, appDbUser: e.target.value }))}
              autoComplete="off"
            />
          </label>

          <label>
            <span>Contraseña interna MySQL para la app</span>
            <Input
              type="password"
              value={form.appDbPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, appDbPassword: e.target.value }))}
              autoComplete="new-password"
            />
          </label>

          <label className="full-span">
            <span>Confirmar contraseña interna MySQL</span>
            <Input
              type="password"
              value={appDbPasswordConfirm}
              onChange={(e) => setAppDbPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="card-panel stack-gap" style={{ background: '#f8fafc' }}>
          <strong>Proceso de instalación</strong>
          {displayedSteps.map((step) => (
            <div
              key={step.key}
              className="detail-row"
              style={{ color: step.status === 'error' ? '#b91c1c' : undefined }}
            >
              <span>{step.label}</span>
              <strong>
                {step.status === 'success'
                  ? 'OK'
                  : step.status === 'error'
                    ? 'Error'
                    : 'Pendiente'}
              </strong>
            </div>
          ))}
        </div>

        <div className="form-actions">
          {!mutation.isSuccess ? (
            <Button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || Boolean(validationError)}
            >
              {mutation.isPending ? 'Instalando...' : 'Preparar instalación local'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onCompleted(mutation.data.health)}>
              Continuar con usuarios iniciales
            </Button>
          )}
        </div>

        {validationError ? <p className="error-text">{validationError}</p> : null}

        {mutation.isError && (
          <p className="error-text">{(mutation.error as Error).message}</p>
        )}

        {mutation.isSuccess && (
          <p style={{ margin: 0, color: '#166534' }}>
            Instalación local terminada. La base, el usuario interno y las tablas ya están listas.
          </p>
        )}
      </div>
    </div>
  );
};
