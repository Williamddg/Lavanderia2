import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@renderer/services/api';
import { DataTable, Input, PageHeader, StatusChip } from '@renderer/ui/components';
import { currency, dateTime } from '@renderer/utils/format';
import { normalizeScan } from '@renderer/utils/normalize';

const normalizePhone = (raw?: string | null) => {
  const digits = String(raw ?? '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('57') && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10) {
    return `57${digits}`;
  }

  if (digits.length > 10 && !digits.startsWith('57')) {
    return `57${digits.slice(-10)}`;
  }

  return digits;
};

const buildReadyMessage = ({
  clientName,
  orderNumber,
  total,
  paidTotal,
  balanceDue
}: {
  clientName: string;
  orderNumber: string;
  total: number;
  paidTotal: number;
  balanceDue: number;
}) => {
  return `Hola ${clientName} 👋

Tu orden *${orderNumber}* ya está *lista para entregar*.

💰 Total: ${new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(total)}
💵 Abonado: ${new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(paidTotal)}
🧾 Saldo: ${new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(balanceDue)}

Puedes pasar por ella cuando desees.`;
};

export const OrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const normalizeScannedCode = (value: string) => {
    const text = normalizeScan(value);

    if (text.startsWith('TK-')) {
      return text.slice(3);
    }

    return text;
  };

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: api.listOrders
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: api.listClients
  });

  const { data: catalogs } = useQuery({
    queryKey: ['order-catalogs'],
    queryFn: api.orderCatalogs
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, statusId }: { orderId: number; statusId: number }) => {
      await api.updateOrderStatus(orderId, statusId);
      return { orderId, statusId };
    },
    onSuccess: async ({ orderId, statusId }) => {
      const selectedStatus = catalogs?.statuses?.find((status) => status.id === statusId);
      const selectedOrder = orders.find((order) => order.id === orderId);

      if (selectedStatus) {
        queryClient.setQueryData(['orders'], (old: any) => {
          if (!Array.isArray(old)) return old;

          return old.map((order: any) =>
            order.id === orderId
              ? {
                  ...order,
                  statusId: selectedStatus.id,
                  statusName: selectedStatus.name,
                  statusColor: selectedStatus.color
                }
              : order
          );
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (!selectedStatus || !selectedOrder) return;

      const statusCode = String(selectedStatus.code ?? '').trim().toUpperCase();

      const shouldSendReadyMessage =
        statusCode === 'READY' ||
        statusCode === 'READY_FOR_DELIVERY' ||
        statusCode === 'LISTO';

      if (!shouldSendReadyMessage) return;

      const client = clients.find((item) => item.id === selectedOrder.clientId);
      const phone = normalizePhone(client?.phone);

      if (!phone) return;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(
        buildReadyMessage({
          clientName: selectedOrder.clientName,
          orderNumber: selectedOrder.orderNumber,
          total: selectedOrder.total,
          paidTotal: selectedOrder.paidTotal,
          balanceDue: selectedOrder.balanceDue
        })
      )}`;

      await api.openExternal(url);
    }
  });

  const normalizedSearch = normalizeScannedCode(search);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'ALL' ? true : order.statusId === statusFilter;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const orderNumber = normalizeScan(String(order.orderNumber ?? ''));
      const clientName = normalizeScan(String(order.clientName ?? ''));
      const statusName = normalizeScan(String(order.statusName ?? ''));

      return (
        orderNumber.includes(normalizedSearch) ||
        clientName.includes(normalizedSearch) ||
        statusName.includes(normalizedSearch)
      );
    });
  }, [orders, statusFilter, normalizedSearch]);

  const handleSearchChange = (value: string) => {
    const cleanedInput = normalizeScan(value);
    setSearch(cleanedInput);

    const normalized = normalizeScannedCode(cleanedInput);

    if (!normalized) return;

    const exactOrder = orders.find(
      (order) => normalizeScan(String(order.orderNumber ?? '')) === normalized
    );

    if (exactOrder) {
      navigate(`/ordenes/${exactOrder.id}`);
    }
  };

  return (
    <section className="stack-gap">
      <PageHeader
        title="Órdenes"
        subtitle="Listado comercial con acciones rápidas sobre cada orden."
        actions={
          <Link className="button button-primary" to="/ordenes/nueva">
            Nueva orden
          </Link>
        }
      />

      <div className="card-panel">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', minWidth: 260 }}>
            <Input
              placeholder="Buscar por orden, cliente o escanear código"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            className="field"
            style={{ maxWidth: 260 }}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
            }
          >
            <option value="ALL">Todos los estados</option>
            {catalogs?.statuses?.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          rows={filteredOrders}
          columns={[
            {
              key: 'number',
              header: 'Consecutivo',
              render: (row) => row.orderNumber
            },
            {
              key: 'client',
              header: 'Cliente',
              render: (row) => row.clientName
            },
            {
              key: 'status-chip',
              header: 'Estado actual',
              render: (row) => <StatusChip label={row.statusName} color={row.statusColor} />
            },
            {
              key: 'status-change',
              header: 'Cambiar estado',
              render: (row) => (
                <select
                  className="field order-status-select"
                  value={row.statusId}
                  disabled={updateStatusMutation.isPending}
                  onChange={async (e) => {
                    const nextStatusId = Number(e.target.value);
                    if (!nextStatusId || nextStatusId === row.statusId) return;

                    await updateStatusMutation.mutateAsync({
                      orderId: row.id,
                      statusId: nextStatusId
                    });
                  }}
                >
                  {catalogs?.statuses?.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              )
            },
            {
              key: 'total',
              header: 'Total',
              render: (row) => currency(row.total)
            },
            {
              key: 'balance',
              header: 'Saldo',
              render: (row) => currency(row.balanceDue)
            },
            {
              key: 'date',
              header: 'Creada',
              render: (row) => dateTime(row.createdAt)
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (row) => (
                <div className="row-actions">
                  <Link to={`/ordenes/${row.id}`}>Ver</Link>
                  <Link to={`/ordenes/${row.id}?action=pay`}>Cobrar</Link>
                  <Link to={`/facturas/${row.id}`}>Facturar</Link>
                  <Link to={`/entregas?orderId=${row.id}`}>Entregar</Link>
                </div>
              )
            }
          ]}
        />
      </div>
    </section>
  );
};