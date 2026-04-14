import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@renderer/services/api';
import { Button, PageHeader } from '@renderer/ui/components';
import { currency, dateTime } from '@renderer/utils/format';
import { Barcode } from '@renderer/ui/components/Barcode';

const renderValue = (value?: string | null) => {
  const text = String(value ?? '').trim();
  return text ? text : '—';
};

export const InvoiceDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-from-order', orderId],
    queryFn: async () => {
      const invoice = await api.createInvoiceFromOrder(Number(orderId));
      return invoice;
    },
    enabled: Boolean(orderId)
  });

  if (isLoading || !data) {
    return <div className="card-panel">Cargando factura...</div>;
  }

  const barcodeValue = String(data.ticketCode ?? '')
    .replace(/[–—−]/g, '-')
    .replace(/"/g, '-')
    .replace(/'/g, '-')
    .trim()
    .toUpperCase();

  return (
    <section className="stack-gap invoice-page">
      <PageHeader
        title={`Factura ${data.invoiceNumber}`}
        subtitle={`Cliente: ${data.clientName}`}
        actions={
          <div className="row-actions no-print">
            <Button
              variant="secondary"
              onClick={() => navigate(`/ordenes/${orderId}`)}
            >
              Volver
            </Button>

            <Button onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
        }
      />

      <div className="thermal-invoice">
        <div
          className="thermal-header"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4
          }}
        >
          {data.companyLogo ? (
            <img
              src={data.companyLogo}
              alt="Logo del negocio"
              style={{
                width: 110,
                maxWidth: '100%',
                maxHeight: 90,
                objectFit: 'contain',
                display: 'block',
                marginBottom: 6
              }}
            />
          ) : null}

          <h2 style={{ margin: 0 }}>
            {data.companyName ?? 'Lavandería & Sastrería'}
          </h2>

          {data.companyNit ? <p style={{ margin: 0 }}>NIT: {data.companyNit}</p> : null}
          {data.companyAddress ? <p style={{ margin: 0 }}>{data.companyAddress}</p> : null}
          {data.companyPhone ? <p style={{ margin: 0 }}>Tel: {data.companyPhone}</p> : null}

          <p style={{ margin: '4px 0 0' }}>
            <strong>{data.invoiceNumber}</strong>
          </p>
        </div>

        <div className="thermal-divider" />

        <div className="thermal-meta">
          <p><strong>Cliente:</strong> {data.clientName}</p>
          <p><strong>Fecha:</strong> {dateTime(data.createdAt)}</p>
          <p>
            <strong>Fecha promesa:</strong>{' '}
            {data.dueDate ? dateTime(data.dueDate) : '—'}
          </p>
          <p><strong>Notas:</strong> {data.notes || '—'}</p>
          <p><strong>Ticket:</strong> {barcodeValue}</p>
        </div>

        <div className="thermal-divider" />

        <div
          className="thermal-barcode"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Código para escanear</strong>
          </p>

          <Barcode
            value={barcodeValue}
            height={50}
            width={1.6}
            displayValue={false}
          />

          <div className="thermal-barcode-text">{barcodeValue}</div>
        </div>

        <div className="thermal-divider" />

        <div className="thermal-items">
          {data.items.map((item, index) => (
            <div key={item.id} className="thermal-item" style={{ marginBottom: 14 }}>
              <div className="thermal-item-top">
                <span>
                  <strong>Ítem #{index + 1}</strong>
                </span>
                <span>
                  <strong>{currency(item.total)}</strong>
                </span>
              </div>

              <div className="thermal-item-bottom">
                <span>{item.description}</span>
                <span>Cant: {item.quantity}</span>
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  lineHeight: 1.5,
                  wordBreak: 'break-word'
                }}
              >
                <div><strong>Precio unitario:</strong> {currency(item.unitPrice)}</div>
                <div><strong>Subtotal:</strong> {currency(item.subtotal)}</div>

                {(Number(item.discountAmount ?? 0) > 0 ||
                  Number(item.surchargeAmount ?? 0) > 0) && (
                  <>
                    <div><strong>Descuento:</strong> {currency(item.discountAmount)}</div>
                    <div><strong>Recargo:</strong> {currency(item.surchargeAmount)}</div>
                  </>
                )}

                <div><strong>Total:</strong> {currency(item.total)}</div>

                {String(item.customerObservations ?? '').trim() && (
                  <div style={{ marginTop: 6 }}>
                    <strong>Observaciones:</strong>{' '}
                    {renderValue(item.customerObservations)}
                  </div>
                )}
              </div>

              <div className="thermal-divider" />
            </div>
          ))}
        </div>

        <div className="thermal-totals">
          <div>
            <span>Subtotal</span>
            <strong>{currency(data.subtotal)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{currency(data.total)}</strong>
          </div>
          <div>
            <span>Abonado</span>
            <strong>{currency(data.paidTotal)}</strong>
          </div>
          <div>
            <span>Saldo</span>
            <strong>{currency(data.balanceDue)}</strong>
          </div>
        </div>

        <div className="thermal-divider" />

        <div className="thermal-footer">
          <p>
            <strong>Texto legal:</strong>{' '}
            {data.legalText || 'Documento generado por el sistema.'}
          </p>

          <p>
            <strong>Políticas del negocio:</strong>{' '}
            {data.companyPolicies || 'No hay políticas configuradas.'}
          </p>

          <p>Gracias por su compra</p>
        </div>

        <div className="no-print thermal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              if (!data.clientPhone) return;

              const phone = data.clientPhone.replace(/\D/g, '');
              const url = `https://wa.me/57${phone}?text=${encodeURIComponent(
                data.whatsappMessage
              )}`;
              await api.openExternal(url);
            }}
          >
            Enviar por WhatsApp
          </Button>
        </div>
      </div>

      <style>
        {`
          .thermal-invoice {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            padding: 6px 2mm;
            box-sizing: border-box;
            background: #fff;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
            overflow-x: hidden;
          }

          .thermal-divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }

          .thermal-meta p,
          .thermal-footer p {
            margin: 4px 0;
            word-break: break-word;
          }

          .thermal-item {
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
          }

          .thermal-item-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            font-weight: 700;
          }

          .thermal-item-top > span:first-child {
            flex: 1;
            min-width: 0;
            word-break: break-word;
          }

          .thermal-item-top > span:last-child {
            flex-shrink: 0;
            white-space: nowrap;
            text-align: right;
          }

          .thermal-item-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            font-size: 11px;
            margin-top: 2px;
          }

          .thermal-item-bottom > span:first-child {
            flex: 1;
            min-width: 0;
            word-break: break-word;
          }

          .thermal-item-bottom > span:last-child {
            flex-shrink: 0;
            white-space: nowrap;
            text-align: right;
          }

          .thermal-totals > div {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            margin: 4px 0;
            font-size: 12px;
          }

          .thermal-totals > div > span:first-child {
            flex: 1;
            min-width: 0;
            word-break: break-word;
          }

          .thermal-totals > div > strong:last-child {
            flex-shrink: 0;
            white-space: nowrap;
            text-align: right;
          }

          .thermal-barcode-text {
            font-size: 11px;
            word-break: break-word;
            text-align: center;
          }

          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }

            html,
            body {
              width: 76mm;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
            }

            .no-print {
              display: none !important;
            }

            .invoice-page {
              margin: 0 !important;
              padding: 0 !important;
            }

            .thermal-invoice {
              width: 72mm !important;
              max-width: 72mm !important;
              margin: 0 !important;
              padding: px 2mm !important;
              box-sizing: border-box !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
              overflow: hidden !important;
            }

            .thermal-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .thermal-item-top,
            .thermal-item-bottom,
            .thermal-totals > div {
              width: 100%;
            }

            .thermal-meta p,
            .thermal-footer p {
              margin: 3px 0 !important;
            }

            img {
              max-width: 100% !important;
            }
          }
        `}
      </style>
    </section>
  );
};