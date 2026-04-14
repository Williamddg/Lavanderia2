import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@renderer/services/api';
import type { DeliveryInput } from '@shared/types';
import { Button, DataTable, Input, Modal, PageHeader } from '@renderer/ui/components';
import { currency, dateTime } from '@renderer/utils/format';

const emptyForm: DeliveryInput = {
  orderId: 0,
  deliveredTo: '',
  receiverDocument: null,
  receiverPhone: null,
  relationshipToClient: null,
  receiverSignature: null,
  ticketCode: ''
};

export const DeliveriesPage = () => {
  const queryClient = useQueryClient();

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: api.listDeliveries
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: api.listOrders
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DeliveryInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [orderFilter, setOrderFilter] = useState('');
  const [modalOrderFilter, setModalOrderFilter] = useState('');

  const mutation = useMutation({
    mutationFn: api.createDelivery,
    onSuccess: async () => {
      setOpen(false);
      setForm(emptyForm);
      setFormError(null);
      setModalOrderFilter('');

      await queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // 🔥 SOLO órdenes válidas para entregar
  const deliverableOrders = orders.filter(
    (order) =>
      !['ENTREGADO', 'DELIVERED', 'CANCELADO', 'CANCELED'].includes(
        order.statusName.toUpperCase()
      )
  );

  // 🔥 filtro del modal
  const filteredDeliverableOrders = useMemo(() => {
    const filter = modalOrderFilter.trim().toLowerCase();
    if (!filter) return deliverableOrders;

    return deliverableOrders.filter((order) => {
      const orderNumber = String(order.orderNumber ?? '').toLowerCase();
      const clientName = String(order.clientName ?? '').toLowerCase();

      return orderNumber.includes(filter) || clientName.includes(filter);
    });
  }, [deliverableOrders, modalOrderFilter]);

  // 🔥 AUTO-SELECCIÓN
  useEffect(() => {
    const value = modalOrderFilter.trim().toLowerCase();

    if (!value) {
      setForm((prev) => ({ ...prev, orderId: 0 }));
      return;
    }

    const match = deliverableOrders.find((order) =>
      String(order.orderNumber ?? '').toLowerCase().includes(value)
    );

    if (match) {
      setForm((prev) => ({ ...prev, orderId: match.id }));
    } else {
      setForm((prev) => ({ ...prev, orderId: 0 }));
    }
  }, [modalOrderFilter, deliverableOrders]);

  // 🔥 filtro tabla principal
  const filteredDeliveries = useMemo(() => {
    const filter = orderFilter.trim().toLowerCase();
    if (!filter) return deliveries;

    return deliveries.filter((delivery) => {
      const relatedOrder = orders.find((order) => order.id === delivery.orderId);
      const orderNumber = relatedOrder?.orderNumber?.toLowerCase() ?? '';
      const orderIdText = String(delivery.orderId).toLowerCase();

      return orderNumber.includes(filter) || orderIdText.includes(filter);
    });
  }, [deliveries, orders, orderFilter]);

  const handleSubmit = () => {
    if (!form.orderId) {
      setFormError('Debes seleccionar una orden.');
      return;
    }

    if (!form.deliveredTo.trim()) {
      setFormError('Debes ingresar el nombre de quien recibe.');
      return;
    }

    setFormError(null);
    mutation.mutate(form);
  };

  const getOrderDisplay = (orderId: number) => {
    const relatedOrder = orders.find((order) => order.id === orderId);
    return relatedOrder?.orderNumber ?? `#${orderId}`;
  };

  return (
    <section className="stack-gap">
      <PageHeader
        title="Entregas"
        subtitle="Listado de entregas y confirmación de órdenes listas."
        actions={
          <Button
            onClick={() => {
              setOpen(true);
              setModalOrderFilter('');
            }}
          >
            Entregar orden
          </Button>
        }
      />

      <div className="card-panel stack-gap">
        <Input
          placeholder="Filtrar por número de orden"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
        />

        <DataTable
          rows={filteredDeliveries}
          columns={[
            {
              key: 'order',
              header: 'Orden',
              render: (row) => getOrderDisplay(row.orderId)
            },
            {
              key: 'who',
              header: 'Recibe',
              render: (row) => row.deliveredTo
            },
            {
              key: 'ticket',
              header: 'Ticket',
              render: (row) => row.ticketCode || '—'
            },
            {
              key: 'balance',
              header: 'Saldo entregado',
              render: (row) => currency(row.outstandingBalance)
            },
            {
              key: 'date',
              header: 'Fecha',
              render: (row) => dateTime(row.createdAt)
            }
          ]}
        />
      </div>

      <Modal open={open} title="Confirmar entrega" onClose={() => setOpen(false)}>
        <div className="stack-gap">

          {/* 🔍 BUSCADOR */}
          <label>
            <span>Buscar orden</span>
            <Input
              placeholder="Ej: 21, 010, cliente..."
              value={modalOrderFilter}
              onChange={(e) => setModalOrderFilter(e.target.value)}
            />
          </label>

          {/* 🔥 ORDEN AUTO */}
          {form.orderId !== 0 && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Seleccionado:{' '}
              {
                deliverableOrders.find((o) => o.id === form.orderId)
                  ?.orderNumber
              }
            </div>
          )}

          <label>
            <span>Orden <strong>*</strong></span>
            <select
              className="field"
              value={form.orderId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  orderId: Number(e.target.value)
                }))
              }
            >
              <option value={0}>Selecciona</option>
              {filteredDeliverableOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} · {order.clientName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Nombre receptor <strong>*</strong></span>
            <Input
              value={form.deliveredTo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deliveredTo: e.target.value
                }))
              }
            />
          </label>

          <label>
            <span>Documento</span>
            <Input
              value={form.receiverDocument ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  receiverDocument: e.target.value || null
                }))
              }
            />
          </label>

          <label>
            <span>Teléfono</span>
            <Input
              value={form.receiverPhone ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  receiverPhone: e.target.value || null
                }))
              }
            />
          </label>

          <label>
            <span>Relación</span>
            <Input
              value={form.relationshipToClient ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  relationshipToClient: e.target.value || null
                }))
              }
            />
          </label>

          <label>
            <span>Firma (texto)</span>
            <Input
              value={form.receiverSignature ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  receiverSignature: e.target.value || null
                }))
              }
            />
          </label>

          <label>
            <span>Ticket</span>
            <Input
              value={form.ticketCode}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  ticketCode: e.target.value
                }))
              }
            />
          </label>

          <div className="form-actions">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>Confirmar entrega</Button>
          </div>

          {formError && <p className="error-text">{formError}</p>}
          {mutation.isError && (
            <p className="error-text">{(mutation.error as Error).message}</p>
          )}
        </div>
      </Modal>
    </section>
  );
};