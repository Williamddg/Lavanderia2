import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ServiceInput } from '@shared/types';
import { api } from '@renderer/services/api';
import { Button, DataTable, Input, Modal, PageHeader } from '@renderer/ui/components';

const emptyForm: ServiceInput = {
  categoryId: null,
  name: '',
  basePrice: 0,
  isActive: true
};

export const InventoryPage = () => {
  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.listServices(false)
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState<ServiceInput>(emptyForm);

  const createMutation = useMutation({
    mutationFn: api.createService,
    onSuccess: async () => {
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await queryClient.invalidateQueries({ queryKey: ['order-catalogs'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ServiceInput }) =>
      api.updateService(id, input),
    onSuccess: async () => {
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await queryClient.invalidateQueries({ queryKey: ['order-catalogs'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await queryClient.invalidateQueries({ queryKey: ['order-catalogs'] });
    }
  });

  const filteredServices = useMemo(() => {
    const search = filter.trim().toLowerCase();
    if (!search) return services;

    return services.filter((service) => {
      const name = service.name.toLowerCase();
      const price = String(service.basePrice);
      const status = service.isActive ? 'activo' : 'inactivo';
      return (
        name.includes(search) ||
        price.includes(search) ||
        status.includes(search)
      );
    });
  }, [services, filter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (service: {
    id: number;
    categoryId: number | null;
    name: string;
    basePrice: number;
    isActive: boolean;
  }) => {
    setEditingId(service.id);
    setForm({
      categoryId: service.categoryId,
      name: service.name,
      basePrice: service.basePrice,
      isActive: service.isActive
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    const payload: ServiceInput = {
      categoryId: form.categoryId ?? null,
      name: form.name.trim(),
      basePrice: Number(form.basePrice || 0),
      isActive: Boolean(form.isActive)
    };

    if (!payload.name) return;
    if (payload.basePrice < 0) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <section className="stack-gap">
      <PageHeader
        title="Inventario"
        subtitle="Catálogo de servicios que luego aparecen en órdenes."
        actions={<Button onClick={openCreate}>Nuevo servicio</Button>}
      />

      <div className="card-panel stack-gap">
        <Input
          placeholder="Buscar por nombre, precio o estado"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <DataTable
          rows={filteredServices}
          columns={[
            {
              key: 'name',
              header: 'Servicio',
              render: (row) => row.name
            },
            {
              key: 'price',
              header: 'Precio base',
              render: (row) =>
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0
                }).format(row.basePrice)
            },
            {
              key: 'status',
              header: 'Estado',
              render: (row) => (row.isActive ? 'Activo' : 'Inactivo')
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (row) => (
                <div className="row-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(row)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
                    Desactivar
                  </Button>
                </div>
              )
            }
          ]}
        />
      </div>

      <Modal
        open={open}
        title={editingId ? 'Editar servicio' : 'Nuevo servicio'}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
          setForm(emptyForm);
        }}
      >
        <div className="stack-gap">
          <label>
            <span>Nombre del servicio</span>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </label>

          <label>
            <span>Precio base</span>
            <Input
              type="number"
              step="0.01"
              value={form.basePrice}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  basePrice: Number(e.target.value)
                }))
              }
            />
          </label>

          <label>
            <span>Estado</span>
            <select
              className="field"
              value={form.isActive ? '1' : '0'}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isActive: e.target.value === '1'
                }))
              }
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </label>

          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
            >
              {editingId ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>

          {createMutation.isError && (
            <p className="error-text">
              {(createMutation.error as Error).message}
            </p>
          )}

          {updateMutation.isError && (
            <p className="error-text">
              {(updateMutation.error as Error).message}
            </p>
          )}

          {deleteMutation.isError && (
            <p className="error-text">
              {(deleteMutation.error as Error).message}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
};