import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { DbConnectionConfig } from '@shared/types';
import { api } from '@renderer/services/api';
import { Button, Input } from '@renderer/ui/components';

const initialState: DbConnectionConfig = { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'lavanderia_negocio', ssl: false };

export const SetupPage = () => {
  const [form, setForm] = useState(initialState);
  const mutation = useMutation({ mutationFn: api.saveDbConfig, onSuccess: () => window.location.reload() });

  return (
    <div className="auth-screen">
      <div className="setup-card-large">
        <span className="eyebrow">Configuración inicial</span>
        <h2>Conexión MySQL por negocio</h2>
        <p>Esta instalación de escritorio trabaja sobre una base independiente para cada negocio.</p>
        <div className="form-grid">
          <label><span>Host</span><Input value={form.host} onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))} /></label>
          <label><span>Puerto</span><Input type="number" value={form.port} onChange={(e) => setForm((prev) => ({ ...prev, port: Number(e.target.value) }))} /></label>
          <label><span>Usuario</span><Input value={form.user} onChange={(e) => setForm((prev) => ({ ...prev, user: e.target.value }))} /></label>
          <label><span>Contraseña</span><Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} /></label>
          <label className="full-span"><span>Base de datos</span><Input value={form.database} onChange={(e) => setForm((prev) => ({ ...prev, database: e.target.value }))} /></label>
        </div>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Guardar conexión y migrar</Button>
        {mutation.isError && <p className="error-text">{(mutation.error as Error).message}</p>}
      </div>
    </div>
  );
};
