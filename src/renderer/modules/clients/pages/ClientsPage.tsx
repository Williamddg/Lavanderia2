import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Client } from '@shared/types';
import { api } from '@renderer/services/api';
import { useModal } from '@renderer/hooks/useModal';
import { Button, DataTable, Modal, PageHeader } from '@renderer/ui/components';
import { ClientForm } from '../components/ClientForm';

export const ClientsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const editModal = useModal<Client>();
  const { data = [] } = useQuery({ queryKey: ['clients'], queryFn: api.listClients });
  const createMutation = useMutation({
    mutationFn: api.createClient,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['clients'] }); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateClient(id, data),
    onSuccess: async () => { editModal.close(); await queryClient.invalidateQueries({ queryKey: ['clients'] }); }
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteClient,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['clients'] }); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); }
  });

  const filtered = useMemo(() => data.filter((client) => `${client.firstName} ${client.lastName} ${client.phone}`.toLowerCase().includes(search.toLowerCase())), [data, search]);

  return (
    <section className="stack-gap">
      <PageHeader title="Clientes" subtitle="Listado y formulario funcional para registrar, editar y eliminar clientes." actions={<input className="field compact-field" placeholder="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)} />} />
      <div className="split-grid">
        <div className="card-panel">
          <DataTable
            rows={filtered}
            columns={[
              { key: 'code', header: 'Código', render: (row) => row.code },
              { key: 'name', header: 'Cliente', render: (row) => `${row.firstName} ${row.lastName}` },
              { key: 'phone', header: 'Teléfono', render: (row) => row.phone },
              { key: 'actions', header: 'Acciones', render: (row) => <div className="row-actions"><Button variant="secondary" onClick={() => editModal.open(row)}>Editar</Button><Button variant="danger" onClick={() => deleteMutation.mutate(row.id)}>Eliminar</Button></div> }
            ]}
          />
        </div>
        <div className="card-panel">
          <PageHeader title="Nuevo cliente" subtitle="Alta rápida con validaciones básicas." />
          <ClientForm onSubmit={(value) => createMutation.mutate(value)} />
          {createMutation.isError && <p className="error-text">{(createMutation.error as Error).message}</p>}
        </div>
      </div>
      <Modal open={editModal.isOpen} title="Editar cliente" onClose={editModal.close}>
        <ClientForm initialValue={editModal.payload} onCancel={editModal.close} onSubmit={(value) => editModal.payload && updateMutation.mutate({ id: editModal.payload.id, data: value })} />
      </Modal>
    </section>
  );
};
