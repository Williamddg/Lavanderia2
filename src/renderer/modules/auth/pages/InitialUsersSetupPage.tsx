import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { BootstrapRole, InitialUsersSetupInput } from '@shared/types';
import { api } from '@renderer/services/api';
import { Button, Input, Select } from '@renderer/ui/components';

type Props = {
  onCompleted: () => void;
};

type UserDraft = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  roleId: number;
};

const createDraft = (roleId = 0): UserDraft => ({
  id: crypto.randomUUID(),
  fullName: '',
  username: '',
  password: '',
  confirmPassword: '',
  roleId
});

const normalizeUsername = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');

const isStrongPassword = (value: string) =>
  value.length >= 10 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

const getAdministratorRoleId = (roles: BootstrapRole[]) =>
  roles.find((role) => role.name === 'Administrador')?.id ?? roles[0]?.id ?? 0;

export const InitialUsersSetupPage = ({ onCompleted }: Props) => {
  const rolesQuery = useQuery({
    queryKey: ['bootstrap-roles'],
    queryFn: api.listBootstrapRoles
  });

  const defaultRoleId = useMemo(
    () => getAdministratorRoleId(rolesQuery.data ?? []),
    [rolesQuery.data]
  );

  const [users, setUsers] = useState<UserDraft[]>([]);

  useEffect(() => {
    if (!defaultRoleId || users.length > 0) {
      return;
    }

    setUsers([createDraft(defaultRoleId)]);
  }, [defaultRoleId, users.length]);

  const usersWithDefaultRole = useMemo(() => {
    if (!defaultRoleId) {
      return users;
    }

    return users.map((user, index) => ({
      ...user,
      roleId: user.roleId || (index === 0 ? defaultRoleId : user.roleId)
    }));
  }, [defaultRoleId, users]);

  const addUser = () => {
    setUsers((current) => [...current, createDraft(defaultRoleId)]);
  };

  const updateUser = (id: string, patch: Partial<UserDraft>) => {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, ...patch } : user))
    );
  };

  const removeUser = (id: string) => {
    setUsers((current) => current.filter((user) => user.id !== id));
  };

  const validationError = useMemo(() => {
    if (!rolesQuery.data?.length) {
      return '';
    }

    if (usersWithDefaultRole.length === 0) {
      return 'Debes crear al menos un usuario inicial.';
    }

    const usernames = new Set<string>();

    for (const user of usersWithDefaultRole) {
      if (!user.fullName.trim()) {
        return 'Todos los usuarios deben tener nombre completo.';
      }

      if (!user.username.trim()) {
        return 'Todos los usuarios deben tener nombre de usuario.';
      }

      const normalizedUsername = normalizeUsername(user.username);
      if (normalizedUsername.length < 3) {
        return 'Cada usuario debe tener al menos 3 caracteres válidos.';
      }

      if (usernames.has(normalizedUsername)) {
        return 'No puede haber nombres de usuario repetidos.';
      }

      usernames.add(normalizedUsername);

      if (!isStrongPassword(user.password)) {
        return 'Cada contraseña debe tener mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial.';
      }

      if (user.password !== user.confirmPassword) {
        return 'Las contraseñas confirmadas no coinciden.';
      }

      if (!user.roleId) {
        return 'Todos los usuarios deben tener un rol asignado.';
      }
    }

    const administratorRoleId = getAdministratorRoleId(rolesQuery.data);
    if (!usersWithDefaultRole.some((user) => user.roleId === administratorRoleId)) {
      return 'Debes crear al menos un Administrador.';
    }

    return '';
  }, [rolesQuery.data, usersWithDefaultRole]);

  const mutation = useMutation({
    mutationFn: (input: InitialUsersSetupInput) => api.bootstrapUsers(input),
    onSuccess: () => {
      onCompleted();
    }
  });

  const handleSubmit = () => {
    const payload: InitialUsersSetupInput = {
      users: usersWithDefaultRole.map((user) => ({
        fullName: user.fullName.trim(),
        username: normalizeUsername(user.username),
        password: user.password,
        roleId: user.roleId
      }))
    };

    mutation.mutate(payload);
  };

  if (rolesQuery.isLoading) {
    return <div className="center-page">Cargando roles iniciales...</div>;
  }

  if (rolesQuery.isError || !rolesQuery.data?.length) {
    return (
      <div className="center-page">
        No fue posible preparar el onboarding inicial de usuarios.
      </div>
    );
  }

  return (
    <section className="auth-screen">
      <div className="setup-card-large stack-gap">
        <span className="eyebrow">Instalación segura</span>
        <h2>Crear usuarios iniciales del sistema</h2>
        <p>
          La aplicación ya tiene la base lista. Ahora define los usuarios reales que
          podrán ingresar. No se crearán credenciales genéricas ni cuentas por defecto.
        </p>

        <div className="card-panel stack-gap" style={{ background: '#f8fafc' }}>
          <strong>Recomendaciones</strong>
          <span>Crea al menos un Administrador y usa contraseñas únicas por persona.</span>
          <span>Las contraseñas viajan por el bridge seguro de Electron y se almacenan con hash.</span>
        </div>

        <div className="form-actions">
          <Button type="button" onClick={addUser}>
            Agregar usuario
          </Button>
        </div>

        {usersWithDefaultRole.map((user, index) => (
          <div key={user.id} className="card-panel stack-gap" style={{ background: '#f8fafc' }}>
            <div className="detail-row">
              <strong>Usuario {index + 1}</strong>
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeUser(user.id)}
                disabled={usersWithDefaultRole.length === 1}
              >
                Eliminar
              </Button>
            </div>

            <div className="form-grid">
              <label>
                <span>Nombre completo</span>
                <Input
                  value={user.fullName}
                  onChange={(event) => updateUser(user.id, { fullName: event.target.value })}
                />
              </label>

              <label>
                <span>Rol</span>
                <Select
                  value={String(user.roleId || defaultRoleId)}
                  onChange={(event) =>
                    updateUser(user.id, { roleId: Number(event.target.value) })
                  }
                >
                  {rolesQuery.data.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label>
                <span>Usuario</span>
                <Input
                  value={user.username}
                  onChange={(event) =>
                    updateUser(user.id, {
                      username: normalizeUsername(event.target.value)
                    })
                  }
                  autoComplete="off"
                />
              </label>

              <label>
                <span>Contraseña</span>
                <Input
                  type="password"
                  value={user.password}
                  onChange={(event) => updateUser(user.id, { password: event.target.value })}
                  autoComplete="new-password"
                />
              </label>

              <label className="full-span">
                <span>Confirmar contraseña</span>
                <Input
                  type="password"
                  value={user.confirmPassword}
                  onChange={(event) =>
                    updateUser(user.id, { confirmPassword: event.target.value })
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>
          </div>
        ))}

        {validationError ? <p className="error-text">{validationError}</p> : null}
        {mutation.isError ? (
          <p className="error-text">{(mutation.error as Error).message}</p>
        ) : null}

        <div className="form-actions">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={Boolean(validationError) || mutation.isPending}
          >
            {mutation.isPending ? 'Guardando usuarios...' : 'Finalizar instalación segura'}
          </Button>
        </div>
      </div>
    </section>
  );
};
