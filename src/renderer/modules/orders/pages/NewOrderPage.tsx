import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@renderer/services/api';
import { PageHeader } from '@renderer/ui/components';
import { OrderForm } from '../components/OrderForm';

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

const buildCreatedOrderMessage = ({
  clientName,
  orderNumber,
  total,
  paidTotal,
  balanceDue,
  dueDate,
  items
}: {
  clientName: string;
  orderNumber: string;
  total: number;
  paidTotal: number;
  balanceDue: number;
  dueDate?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    customerObservations?: string | null;
  }>;
}) => {
  const money = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(value ?? 0));

  const itemsText = items.length
    ? items
        .map((item, index) => {
          const observations = String(item.customerObservations ?? '').trim();

          return [
            `${index + 1}. ${item.description}`,
            `   Cant: ${item.quantity} | Unit: ${money(item.unitPrice)} | Total: ${money(item.total)}`,
            observations ? `   Obs: ${observations}` : null
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n')
    : 'Sin ítems registrados';

  return `Hola ${clientName} 👋

Te confirmamos que tu orden *${orderNumber}* fue creada correctamente.

*DETALLE DE PRENDAS / SERVICIOS*
${itemsText}

*RESUMEN*
💰 Total: ${money(total)}
💵 Abonado: ${money(paidTotal)}
🧾 Saldo: ${money(balanceDue)}
📅 Fecha promesa: ${dueDate ? new Date(dueDate).toLocaleDateString('es-CO') : 'Sin definir'}

Gracias por confiar en nosotros.`;
};

export const NewOrderPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: api.listClients
  });

  const { data: catalogs } = useQuery({
    queryKey: ['order-catalogs'],
    queryFn: api.orderCatalogs
  });

  const mutation = useMutation({
    mutationFn: api.createOrder,
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['cash-summary'] });

      const client = clients.find((item) => item.id === order.clientId);
      const phone = normalizePhone(client?.phone);

      if (phone) {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(
          buildCreatedOrderMessage({
            clientName: order.clientName,
            orderNumber: order.orderNumber,
            total: order.total,
            paidTotal: order.paidTotal,
            balanceDue: order.balanceDue,
            dueDate: order.dueDate,
            items: order.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              customerObservations: item.customerObservations
            }))
          })
        )}`;

        await api.openExternal(url);
      }

      navigate(`/ordenes/${order.id}`);
    }
  });

  return (
    <section className="stack-gap">
      <PageHeader
        title="Nueva orden"
        subtitle="Crea una orden real con múltiples ítems, descuento y saldo."
      />
      <div className="card-panel">
        <OrderForm
          clients={clients}
          catalogs={catalogs}
          onSubmit={(value) => mutation.mutate(value)}
        />
        {mutation.isError && (
          <p className="error-text">{(mutation.error as Error).message}</p>
        )}
      </div>
    </section>
  );
};