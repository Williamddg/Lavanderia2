import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@renderer/services/api';
import {
  Button,
  DataTable,
  Input,
  Modal,
  PageHeader,
  StatusChip
} from '@renderer/ui/components';
import { currency, dateTime } from '@renderer/utils/format';
import { PaymentForm } from '@renderer/modules/payments/components/PaymentForm';
import { OrderForm } from '../components/OrderForm';

const tabs = ['Resumen', 'Prendas', 'Pagos', 'Facturas', 'Entregas'] as const;

const renderValue = (value?: string | null) => {
  const text = String(value ?? '').trim();
  return text ? text : '—';
};

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

export const OrderDetailPage = () => {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: api.listClients
  });

  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const orderId = Number(params.orderId);

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Resumen');
  const [paymentModal, setPaymentModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const [passwordModal, setPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'edit' | 'cancel' | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'pay') {
      setPaymentModal(true);
    }
  }, [searchParams]);

  const { data } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => api.orderDetail(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0
  });

  const { data: catalogs } = useQuery({
    queryKey: ['order-catalogs'],
    queryFn: api.orderCatalogs
  });

  const paymentMutation = useMutation({
    mutationFn: api.createPayment,
    onSuccess: async (payment) => {
      setPaymentModal(false);

      await queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const methodCode = String(
        catalogs?.paymentMethods?.find((method) => method.id === payment.paymentMethodId)?.code ?? ''
      )
        .trim()
        .toLowerCase();

      const methodName = String(payment.paymentMethodName ?? '')
        .trim()
        .toLowerCase();

      const isCash = methodCode === 'cash' || methodName === 'efectivo';

      if (isCash) {
        try {
          await api.openCashDrawer();
        } catch (error) {
          console.error('No se pudo abrir el cajón automáticamente:', error);
        }
      }
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: (input: any) => api.updateOrder(orderId, input),
    onSuccess: async () => {
      setEditModal(false);
      await queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: () => api.cancelOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: (plainPassword: string) => api.verifyPassword(plainPassword),
    onSuccess: async () => {
      const action = pendingAction;

      setPasswordModal(false);
      setPassword('');
      setPasswordError(null);
      setPendingAction(null);

      if (action === 'edit') {
        setEditModal(true);
        return;
      }

      if (action === 'cancel') {
        const ok = window.confirm('¿Seguro que deseas cancelar esta orden?');
        if (!ok) return;
        await cancelOrderMutation.mutateAsync();
      }
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      return api.updateOrderStatus(orderId, statusId);
    },
    onSuccess: async (_result, statusId) => {
      await queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const selectedStatus = catalogs?.statuses?.find((s) => s.id === statusId);
      const client = clients.find((c) => c.id === data?.clientId);
      const phone = normalizePhone(client?.phone);

      if (!selectedStatus || !data || !phone) return;

      const statusCode = String(selectedStatus.code ?? '').toUpperCase();

      if (statusCode === 'READY' || statusCode === 'READY_FOR_DELIVERY' || statusCode === 'LISTO') {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(
          buildReadyMessage({
            clientName: data.clientName,
            orderNumber: data.orderNumber,
            total: data.total,
            paidTotal: data.paidTotal,
            balanceDue: data.balanceDue
          })
        )}`;

        await api.openExternal(url);
      }
    }
  });

  const requestProtectedAction = (action: 'edit' | 'cancel') => {
    setPendingAction(action);
    setPassword('');
    setPasswordError(null);
    setPasswordModal(true);
  };

  const handleConfirmPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Debes ingresar la contraseña.');
      return;
    }

    await verifyPasswordMutation.mutateAsync(password);
  };

  const tabContent = useMemo(() => {
    if (!data) return null;

    switch (activeTab) {
      case 'Prendas':
        return (
          <div className="stack-gap">
            {data.items.map((item, index) => (
              <div key={item.id} className="card-panel stack-gap">
                <div className="detail-grid">
                  <div className="stack-gap">
                    <div className="detail-row">
                      <span>Prenda</span>
                      <strong>{item.description}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Cantidad</span>
                      <strong>{item.quantity}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Precio unitario</span>
                      <strong>{currency(item.unitPrice)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Total</span>
                      <strong>{currency(item.total)}</strong>
                    </div>
                  </div>

                  <div className="stack-gap">
                    <div className="detail-row">
                      <span>Color</span>
                      <strong>{renderValue(item.color)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Marca</span>
                      <strong>{renderValue(item.brand)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Talla / referencia</span>
                      <strong>{renderValue(item.sizeReference)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Material</span>
                      <strong>{renderValue(item.material)}</strong>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="stack-gap">
                    <div className="detail-row">
                      <span>Condición al recibir</span>
                      <strong>{renderValue(item.receivedCondition)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Detalle del trabajo</span>
                      <strong>{renderValue(item.workDetail)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Manchas</span>
                      <strong>{renderValue(item.stains)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Daños</span>
                      <strong>{renderValue(item.damages)}</strong>
                    </div>
                  </div>

                  <div className="stack-gap">
                    <div className="detail-row">
                      <span>Accesorios faltantes</span>
                      <strong>{renderValue(item.missingAccessories)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Obs. cliente</span>
                      <strong>{renderValue(item.customerObservations)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Obs. internas</span>
                      <strong>{renderValue(item.internalObservations)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Ítem</span>
                      <strong>#{index + 1}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'Pagos':
        return (
          <DataTable
            rows={data.payments}
            columns={[
              { key: 'method', header: 'Método', render: (row) => row.paymentMethodName },
              { key: 'amount', header: 'Monto', render: (row) => currency(row.amount) },
              { key: 'reference', header: 'Referencia', render: (row) => row.reference || '—' },
              { key: 'date', header: 'Fecha', render: (row) => dateTime(row.createdAt) }
            ]}
          />
        );

      case 'Facturas':
        return (
          <DataTable
            rows={data.invoices}
            columns={[
              { key: 'invoice', header: 'Factura', render: (row) => row.invoiceNumber },
              { key: 'total', header: 'Total', render: (row) => currency(row.total) },
              { key: 'date', header: 'Fecha', render: (row) => dateTime(row.createdAt) },
              {
                key: 'actions',
                header: 'Acciones',
                render: () => (
                  <Link to={`/facturas/${data.id}`} className="button button-secondary">
                    Ver factura
                  </Link>
                )
              }
            ]}
          />
        );

      case 'Entregas':
        return (
          <DataTable
            rows={data.deliveries}
            columns={[
              { key: 'who', header: 'Recibe', render: (row) => row.deliveredTo },
              { key: 'ticket', header: 'Ticket', render: (row) => row.ticketCode },
              { key: 'date', header: 'Fecha', render: (row) => dateTime(row.createdAt) }
            ]}
          />
        );

      default:
        return (
          <div className="detail-grid">
            <div className="card-panel stack-gap">
              <div className="detail-row">
                <span>Cliente</span>
                <strong>{data.clientName}</strong>
              </div>

              <div className="detail-row" style={{ alignItems: 'center' }}>
                <span>Estado actual</span>
                <StatusChip label={data.statusName} color={data.statusColor} />
              </div>

              <label>
                <span>Cambiar estado</span>
                <select
                  className="field order-status-select"
                  value={data.statusId}
                  disabled={updateStatusMutation.isPending}
                  onChange={async (e) => {
                    const nextStatusId = Number(e.target.value);
                    if (!nextStatusId || nextStatusId === data.statusId) return;
                    await updateStatusMutation.mutateAsync(nextStatusId);
                  }}
                >
                  {catalogs?.statuses?.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="detail-row">
                <span>Fecha promesa</span>
                <strong>{data.dueDate ? dateTime(data.dueDate) : '—'}</strong>
              </div>

              <div className="detail-row">
                <span>Notas</span>
                <strong>{data.notes || 'Sin notas'}</strong>
              </div>
            </div>

            <div className="card-panel stack-gap">
              <div className="detail-row">
                <span>Subtotal</span>
                <strong>{currency(data.subtotal)}</strong>
              </div>
              <div className="detail-row">
                <span>Descuento</span>
                <strong>{currency(data.discountTotal)}</strong>
              </div>
              <div className="detail-row">
                <span>Total</span>
                <strong>{currency(data.total)}</strong>
              </div>
              <div className="detail-row">
                <span>Pagado</span>
                <strong>{currency(data.paidTotal)}</strong>
              </div>
              <div className="detail-row">
                <span>Saldo</span>
                <strong>{currency(data.balanceDue)}</strong>
              </div>
            </div>
          </div>
        );
    }
  }, [activeTab, data, catalogs, updateStatusMutation, clients]);

  if (!data) return <section className="card-panel">Cargando detalle...</section>;

  return (
    <section className="stack-gap">
      <PageHeader
        title={`Orden ${data.orderNumber}`}
        subtitle={`Creada ${dateTime(data.createdAt)}`}
        actions={
          <div className="row-actions">
            <Button variant="secondary" onClick={() => setPaymentModal(true)}>
              Registrar pago
            </Button>

            <Button
              variant="secondary"
              onClick={() => requestProtectedAction('edit')}
            >
              Editar orden
            </Button>

            <Button
              variant="danger"
              onClick={() => requestProtectedAction('cancel')}
            >
              Cancelar orden
            </Button>

            <Link className="button button-secondary" to={`/facturas/${data.id}`}>
              Generar factura
            </Link>

            <Link className="button button-secondary" to="/ordenes">
              Volver
            </Link>
          </div>
        }
      />

      <div className="tabs-row">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-chip ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card-panel">{tabContent}</div>

      <Modal
        open={paymentModal}
        title="Registrar pago"
        onClose={() => setPaymentModal(false)}
      >
        <PaymentForm
          orderId={data.id}
          catalogs={catalogs}
          balanceDue={data.balanceDue}
          onSubmit={(value) => paymentMutation.mutate(value)}
        />
      </Modal>

      <Modal
        open={editModal}
        title="Editar orden"
        onClose={() => setEditModal(false)}
      >
        <OrderForm
          clients={clients}
          catalogs={catalogs}
          initialValue={data}
          hideInitialPaymentFields
          submitLabel="Guardar cambios"
          onSubmit={(value) => updateOrderMutation.mutate(value)}
        />
        {updateOrderMutation.isError && (
          <p className="error-text">{(updateOrderMutation.error as Error).message}</p>
        )}
      </Modal>

      <Modal
        open={passwordModal}
        title="Confirmación requerida"
        onClose={() => {
          setPasswordModal(false);
          setPassword('');
          setPasswordError(null);
          setPendingAction(null);
        }}
      >
        <div className="stack-gap">
          <p>
            Ingresa la contraseña para{' '}
            {pendingAction === 'edit' ? 'editar' : 'cancelar'} la orden.
          </p>

          <label>
            <span>Contraseña</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {passwordError && <p className="error-text">{passwordError}</p>}

          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setPasswordModal(false);
                setPassword('');
                setPasswordError(null);
                setPendingAction(null);
              }}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleConfirmPassword}
              disabled={verifyPasswordMutation.isPending}
            >
              {verifyPasswordMutation.isPending ? 'Verificando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      {cancelOrderMutation.isError && (
        <p className="error-text">{(cancelOrderMutation.error as Error).message}</p>
      )}
    </section>
  );
};