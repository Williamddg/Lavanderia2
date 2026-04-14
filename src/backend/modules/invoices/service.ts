import { sql, type Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { Invoice, InvoiceDetail } from '../../../shared/types.js';

const buildTicketCode = (orderNumber: string) => `TK-${orderNumber}`;

const buildWhatsappMessage = (invoice: {
  invoiceNumber: string;
  clientName: string;
  dueDate: string | null;
  notes: string | null;
  legalText: string | null;
  companyPolicies: string | null;
  total: number;
  paidTotal: number;
  balanceDue: number;
  ticketCode: string;
  companyName: string | null;
  items: Array<any>;
}) => {
  const formatMoney = (value: number) =>
    `$${Number(value ?? 0).toLocaleString('es-CO')}`;

  const itemsText = invoice.items
    .map((item, index) => {
      const observations = String(item.customerObservations ?? '').trim();

      return [
        `${index + 1}. ${item.description}`,
        `   Cant: ${item.quantity} | Unit: ${formatMoney(item.unitPrice)} | Total: ${formatMoney(
          item.total
        )}`,
        observations ? `   Obs: ${observations}` : null
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const lines = [
    `Hola ${invoice.clientName},`,
    '',
    `${invoice.companyName ?? 'Nuestro negocio'} te comparte tu factura:`,
    `Factura: ${invoice.invoiceNumber}`,
    invoice.dueDate
      ? `Fecha promesa: ${new Date(invoice.dueDate).toLocaleDateString('es-CO')}`
      : null,
    '',
    '*DETALLE DE PRENDAS*',
    itemsText || 'Sin ítems registrados.',
    '',
    '*RESUMEN*',
    `Total: ${formatMoney(invoice.total)}`,
    `Abonado: ${formatMoney(invoice.paidTotal)}`,
    `Saldo: ${formatMoney(invoice.balanceDue)}`,
    `Ticket: ${invoice.ticketCode}`,
    invoice.notes ? `Notas: ${invoice.notes}` : null,
    invoice.companyPolicies ? `Políticas: ${invoice.companyPolicies}` : null
  ].filter(Boolean);

  return lines.join('\n');
};

const mapInvoice = (row: any): Invoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  orderId: row.order_id,
  clientId: row.client_id,
  clientName: row.client_name,
  clientPhone: row.client_phone ?? null,
  subtotal: Number(row.subtotal),
  taxTotal: Number(row.tax_total),
  total: Number(row.total),
  legalText: row.legal_text,
  dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
  notes: row.order_notes ?? null,
  paidTotal: Number(row.paid_total ?? 0),
  balanceDue: Number(row.balance_due ?? 0),
  ticketCode: row.ticket_code,
  companyName: row.company_name ?? null,
  companyPhone: row.company_phone ?? null,
  companyAddress: row.company_address ?? null,
  companyNit: row.company_nit ?? null,
  companyLogo: row.company_logo ?? null,
  companyPolicies: row.company_policies ?? null,
  createdAt: new Date(row.created_at).toISOString()
});

export const createInvoicesService = (db: Kysely<Database>) => {
  const list = async (): Promise<Invoice[]> => {
    const company = await db
      .selectFrom('company_settings')
      .selectAll()
      .orderBy('id')
      .limit(1)
      .executeTakeFirst();

    const rows = await db
      .selectFrom('invoices as i')
      .innerJoin('clients as c', 'c.id', 'i.client_id')
      .innerJoin('orders as o', 'o.id', 'i.order_id')
      .select([
        'i.id',
        'i.invoice_number',
        'i.order_id',
        'i.client_id',
        'i.subtotal',
        'i.tax_total',
        'i.total',
        'i.legal_text',
        'i.created_at',
        'o.due_date',
        'o.notes as order_notes',
        'o.paid_total',
        'o.balance_due',
        'o.order_number',
        sql<string>`c.first_name`.as('first_name'),
        sql<string>`c.last_name`.as('last_name'),
        sql<string | null>`c.phone`.as('client_phone')
      ])
      .orderBy('i.id desc')
      .execute();

    return rows.map((row) =>
      mapInvoice({
        ...row,
        client_name: `${row.first_name} ${row.last_name}`,
        ticket_code: buildTicketCode(row.order_number),
        company_name: company?.company_name ?? null,
        company_phone: company?.phone ?? null,
        company_address: company?.address ?? null,
        company_nit: company?.nit ?? null,
        company_logo: company?.logo_base64 ?? null,
        company_policies: company?.invoice_policies ?? null
      })
    );
  };

  const detail = async (id: number): Promise<InvoiceDetail> => {
    const company = await db
      .selectFrom('company_settings')
      .selectAll()
      .orderBy('id')
      .limit(1)
      .executeTakeFirst();

    const invoice = await db
      .selectFrom('invoices as i')
      .innerJoin('clients as c', 'c.id', 'i.client_id')
      .innerJoin('orders as o', 'o.id', 'i.order_id')
      .select([
        'i.id',
        'i.invoice_number',
        'i.order_id',
        'i.client_id',
        'i.subtotal',
        'i.tax_total',
        'i.total',
        'i.legal_text',
        'i.created_at',
        'o.order_number',
        'o.due_date',
        'o.notes as order_notes',
        'o.paid_total',
        'o.balance_due',
        sql<string>`c.first_name`.as('first_name'),
        sql<string>`c.last_name`.as('last_name'),
        sql<string | null>`c.phone`.as('client_phone')
      ])
      .where('i.id', '=', id)
      .executeTakeFirstOrThrow();

    const items = await db
      .selectFrom('invoice_items_snapshot')
      .selectAll()
      .where('invoice_id', '=', id)
      .orderBy('id')
      .execute();

    const mapped = mapInvoice({
      ...invoice,
      client_name: `${invoice.first_name} ${invoice.last_name}`,
      ticket_code: buildTicketCode(invoice.order_number),
      company_name: company?.company_name ?? null,
      company_phone: company?.phone ?? null,
      company_address: company?.address ?? null,
      company_nit: company?.nit ?? null,
      company_logo: company?.logo_base64 ?? null,
      company_policies: company?.invoice_policies ?? null
    });

    return {
      ...mapped,
      items: items.map((item) => ({
        id: item.id,
        garmentTypeId: item.garment_type_id ?? null,
        serviceId: item.service_id ?? null,
        description: item.description,
        quantity: Number(item.quantity),
        color: null,
        brand: null,
        sizeReference: null,
        material: null,
        receivedCondition: null,
        workDetail: null,
        stains: null,
        damages: null,
        missingAccessories: null,
        customerObservations: item.customer_observations ?? null,
        internalObservations: null,
        unitPrice: Number(item.unit_price),
        discountAmount: Number(item.discount_amount ?? 0),
        surchargeAmount: Number(item.surcharge_amount ?? 0),
        subtotal: Number(item.subtotal),
        total: Number(item.total ?? item.subtotal)
      })),
      whatsappMessage: buildWhatsappMessage({
        invoiceNumber: mapped.invoiceNumber,
        clientName: mapped.clientName,
        dueDate: mapped.dueDate,
        notes: mapped.notes,
        legalText: mapped.legalText,
        companyPolicies: mapped.companyPolicies,
        total: mapped.total,
        paidTotal: mapped.paidTotal,
        balanceDue: mapped.balanceDue,
        ticketCode: mapped.ticketCode,
        companyName: mapped.companyName,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          total: Number(item.total ?? item.subtotal),
          customerObservations: item.customer_observations ?? null
        }))
      })
    };
  };

  const createFromOrder = async (orderId: number): Promise<InvoiceDetail> => {
    const order = await db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirstOrThrow();

    const orderItems = await db
      .selectFrom('order_items')
      .selectAll()
      .where('order_id', '=', orderId)
      .orderBy('id')
      .execute();

    const company = await db
      .selectFrom('company_settings')
      .selectAll()
      .limit(1)
      .executeTakeFirst();

    const existingInvoice = await db
      .selectFrom('invoices')
      .select(['id', 'invoice_number'])
      .where('order_id', '=', orderId)
      .orderBy('id desc')
      .executeTakeFirst();

    let invoiceId = 0;

    if (existingInvoice) {
      invoiceId = existingInvoice.id;

      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('invoices')
          .set({
            client_id: order.client_id,
            subtotal: order.subtotal,
            tax_total: 0,
            total: order.total,
            legal_text: company?.company_name
              ? `Documento generado por ${company.company_name}.`
              : 'Documento generado por el sistema.'
          })
          .where('id', '=', invoiceId)
          .execute();

        await trx
          .deleteFrom('invoice_items_snapshot')
          .where('invoice_id', '=', invoiceId)
          .execute();

        await trx
          .insertInto('invoice_items_snapshot')
          .values(
            orderItems.map((item) => ({
              invoice_id: invoiceId,
              garment_type_id: item.garment_type_id,
              service_id: item.service_id,
              description: item.description,
              quantity: item.quantity,
              color: item.color,
              brand: item.brand,
              size_reference: item.size_reference,
              material: item.material,
              received_condition: item.received_condition,
              work_detail: item.work_detail,
              stains: item.stains,
              damages: item.damages,
              missing_accessories: item.missing_accessories,
              customer_observations: item.customer_observations,
              internal_observations: item.internal_observations,
              unit_price: item.unit_price,
              discount_amount: item.discount_amount ?? 0,
              surcharge_amount: item.surcharge_amount ?? 0,
              subtotal: item.subtotal,
              total: item.total ?? item.subtotal
            }))
          )
          .execute();

        await trx
          .insertInto('audit_logs')
          .values({
            action: 'INVOICE_REFRESH',
            entity_type: 'invoice',
            entity_id: String(invoiceId),
            details_json: JSON.stringify({
              orderId,
              invoiceNumber: existingInvoice.invoice_number
            })
          })
          .execute();
      });

      return detail(invoiceId);
    }

    const counter = await db
      .selectFrom('counters')
      .selectAll()
      .where('counter_key', '=', 'invoices')
      .executeTakeFirstOrThrow();

    const nextValue = Number(counter.current_value) + 1;
    const invoiceNumber = `${counter.prefix}-${String(nextValue).padStart(counter.padding, '0')}`;

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('counters')
        .set({ current_value: nextValue })
        .where('id', '=', counter.id)
        .execute();

      const inserted = await trx
        .insertInto('invoices')
        .values({
          invoice_number: invoiceNumber,
          order_id: order.id,
          client_id: order.client_id,
          subtotal: order.subtotal,
          tax_total: 0,
          total: order.total,
          legal_text: company?.company_name
            ? `Documento generado por ${company.company_name}.`
            : 'Documento generado por el sistema.'
        })
        .executeTakeFirstOrThrow();

      invoiceId = Number(inserted.insertId);

      await trx
        .insertInto('invoice_items_snapshot')
        .values(
          orderItems.map((item) => ({
            invoice_id: invoiceId,
            garment_type_id: item.garment_type_id,
            service_id: item.service_id,
            description: item.description,
            quantity: item.quantity,
            color: item.color,
            brand: item.brand,
            size_reference: item.size_reference,
            material: item.material,
            received_condition: item.received_condition,
            work_detail: item.work_detail,
            stains: item.stains,
            damages: item.damages,
            missing_accessories: item.missing_accessories,
            customer_observations: item.customer_observations,
            internal_observations: item.internal_observations,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount ?? 0,
            surcharge_amount: item.surcharge_amount ?? 0,
            subtotal: item.subtotal,
            total: item.total ?? item.subtotal
          }))
        )
        .execute();

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'INVOICE_CREATE',
          entity_type: 'invoice',
          entity_id: String(invoiceId),
          details_json: JSON.stringify({ orderId, invoiceNumber })
        })
        .execute();
    });

    return detail(invoiceId);
  };

  return { list, detail, createFromOrder };
};