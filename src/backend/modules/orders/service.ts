import { z } from 'zod';
import { sql, type Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type {
  CatalogsPayload,
  DashboardSummary,
  Order,
  OrderDetail,
  OrderInput
} from '../../../shared/types.js';
import { createOrderRepository } from './repositories/order-repository.js';
import { createPaymentsService } from '../payments/service.js';
import { createInvoicesService } from '../invoices/service.js';
import { createDeliveriesService } from '../deliveries/service.js';

const orderItemSchema = z.object({
  garmentTypeId: z.number().nullable(),
  serviceId: z.number().nullable(),
  description: z.string().trim().min(3),
  quantity: z.number().positive(),
  color: z.string().nullable(),
  brand: z.string().nullable(),
  sizeReference: z.string().nullable(),
  material: z.string().nullable(),
  receivedCondition: z.string().nullable(),
  workDetail: z.string().nullable(),
  stains: z.string().nullable(),
  damages: z.string().nullable(),
  missingAccessories: z.string().nullable(),
  customerObservations: z.string().nullable(),
  internalObservations: z.string().nullable(),
  unitPrice: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  surchargeAmount: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative()
});

const orderSchema = z.object({
  clientId: z.number().positive(),
  notes: z.string().nullable(),
  dueDate: z.string().nullable(),
  discountTotal: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  initialPaymentMethodId: z.number().nullable().optional(),
  initialPaymentReference: z.string().nullable().optional(),
  items: z.array(orderItemSchema).min(1)
});

const mapOrder = (row: any): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  clientId: row.client_id,
  clientName: row.client_name,
  statusId: row.status_id,
  statusName: row.status_name,
  statusColor: row.status_color,
  notes: row.notes,
  subtotal: Number(row.subtotal),
  discountTotal: Number(row.discount_total),
  total: Number(row.total),
  paidTotal: Number(row.paid_total),
  balanceDue: Number(row.balance_due),
  dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
  createdAt: new Date(row.created_at).toISOString()
});

export const createOrdersService = (db: Kysely<Database>) => {
  const repository = createOrderRepository(db);
  const paymentsService = createPaymentsService(db);
  const invoicesService = createInvoicesService(db);
  const deliveriesService = createDeliveriesService(db);

  const detail = async (id: number): Promise<OrderDetail> => {
    const order = await repository.findById(id);
    if (!order) throw new Error('Orden no encontrada.');

    const items = await repository.findItems(id);
    const [payments, invoices, deliveries] = await Promise.all([
      paymentsService.list(id),
      (await invoicesService.list()).filter((invoice) => invoice.orderId === id),
      (await deliveriesService.list()).filter((delivery) => delivery.orderId === id)
    ]);

    return {
      ...mapOrder(order),
      items: items.map((item) => ({
        id: item.id,
        garmentTypeId: item.garment_type_id,
        serviceId: item.service_id,
        description: item.description,
        quantity: Number(item.quantity),
        color: item.color,
        brand: item.brand,
        sizeReference: item.size_reference,
        material: item.material,
        receivedCondition: item.received_condition,
        workDetail: item.work_detail,
        stains: item.stains,
        damages: item.damages,
        missingAccessories: item.missing_accessories,
        customerObservations: item.customer_observations,
        internalObservations: item.internal_observations,
        unitPrice: Number(item.unit_price),
        discountAmount: Number(item.discount_amount ?? 0),
        surchargeAmount: Number(item.surcharge_amount ?? 0),
        subtotal: Number(item.subtotal),
        total: Number(item.total ?? item.subtotal)
      })),
      payments,
      invoices,
      deliveries
    };
  };

  const create = async (input: OrderInput): Promise<OrderDetail> => {
    const parsed = orderSchema.parse(input);

    const counter = await db
      .selectFrom('counters')
      .selectAll()
      .where('counter_key', '=', 'orders')
      .executeTakeFirstOrThrow();

    const nextValue = Number(counter.current_value) + 1;
    const orderNumber = `${counter.prefix}-${String(nextValue).padStart(counter.padding, '0')}`;

    const subtotal = parsed.items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsTotal = parsed.items.reduce((sum, item) => sum + item.total, 0);
    const total = Math.max(0, itemsTotal - parsed.discountTotal);
    const paidTotal = Math.min(parsed.paidAmount, total);

    if (paidTotal > 0 && !parsed.initialPaymentMethodId) {
      throw new Error('Debes seleccionar el método de pago del abono inicial.');
    }

    let orderId = 0;

    await db.transaction().execute(async (trx) => {
      const receivedStatus = await trx
        .selectFrom('order_statuses')
        .select('id')
        .where('code', 'in', ['RECEIVED', 'CREATED'])
        .orderBy('id')
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('counters')
        .set({ current_value: nextValue })
        .where('id', '=', counter.id)
        .execute();

      const inserted = await trx
        .insertInto('orders')
        .values({
          order_number: orderNumber,
          client_id: parsed.clientId,
          status_id: receivedStatus.id,
          notes: parsed.notes,
          subtotal,
          discount_total: parsed.discountTotal,
          total,
          paid_total: 0,
          balance_due: total,
          due_date: parsed.dueDate ? new Date(parsed.dueDate) : null
        })
        .executeTakeFirstOrThrow();

      orderId = Number(inserted.insertId);

      await trx
        .insertInto('order_items')
        .values(
          parsed.items.map((item) => ({
            order_id: orderId,
            garment_type_id: item.garmentTypeId,
            service_id: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            color: item.color,
            brand: item.brand,
            size_reference: item.sizeReference,
            material: item.material,
            received_condition: item.receivedCondition,
            work_detail: item.workDetail,
            stains: item.stains,
            damages: item.damages,
            missing_accessories: item.missingAccessories,
            customer_observations: item.customerObservations,
            internal_observations: item.internalObservations,
            unit_price: item.unitPrice,
            discount_amount: item.discountAmount,
            surcharge_amount: item.surchargeAmount,
            subtotal: item.subtotal,
            total: item.total
          }))
        )
        .execute();

      await trx
        .insertInto('order_status_history')
        .values({
          order_id: orderId,
          status_id: receivedStatus.id,
          notes: 'Orden recibida'
        })
        .execute();

      await trx
        .insertInto('order_logs')
        .values({
          order_id: orderId,
          event_type: 'CREATE',
          description: 'Orden creada en escritorio'
        })
        .execute();

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'ORDER_CREATE',
          entity_type: 'order',
          entity_id: String(orderId),
          details_json: JSON.stringify({ orderNumber, total })
        })
        .execute();
    });

    if (paidTotal > 0) {
      await paymentsService.create({
        orderId,
        paymentMethodId: parsed.initialPaymentMethodId as number,
        amount: paidTotal,
        reference: parsed.initialPaymentReference || 'Abono inicial'
      });
    }

    return detail(orderId);
  };

  const update = async (orderId: number, input: OrderInput): Promise<OrderDetail> => {
    const parsed = orderSchema.parse(input);

    const existingOrder = await db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!existingOrder) {
      throw new Error('Orden no encontrada.');
    }

    const deliveriesCount = await db
      .selectFrom('delivery_records')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('order_id', '=', orderId)
      .executeTakeFirstOrThrow();

    if (Number(deliveriesCount.count ?? 0) > 0) {
      throw new Error('No puedes editar una orden que ya fue entregada.');
    }

    const subtotal = parsed.items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsTotal = parsed.items.reduce((sum, item) => sum + item.total, 0);
    const total = Math.max(0, itemsTotal - parsed.discountTotal);
    const paidTotal = Number(existingOrder.paid_total ?? 0);

    if (paidTotal > total) {
      throw new Error('El nuevo total no puede ser menor que lo ya abonado.');
    }

    const balanceDue = Math.max(0, total - paidTotal);

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('orders')
        .set({
          client_id: parsed.clientId,
          notes: parsed.notes,
          subtotal,
          discount_total: parsed.discountTotal,
          total,
          balance_due: balanceDue,
          due_date: parsed.dueDate ? new Date(parsed.dueDate) : null
        })
        .where('id', '=', orderId)
        .execute();

      await trx
        .deleteFrom('order_items')
        .where('order_id', '=', orderId)
        .execute();

      await trx
        .insertInto('order_items')
        .values(
          parsed.items.map((item) => ({
            order_id: orderId,
            garment_type_id: item.garmentTypeId,
            service_id: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            color: item.color,
            brand: item.brand,
            size_reference: item.sizeReference,
            material: item.material,
            received_condition: item.receivedCondition,
            work_detail: item.workDetail,
            stains: item.stains,
            damages: item.damages,
            missing_accessories: item.missingAccessories,
            customer_observations: item.customerObservations,
            internal_observations: item.internalObservations,
            unit_price: item.unitPrice,
            discount_amount: item.discountAmount,
            surcharge_amount: item.surchargeAmount,
            subtotal: item.subtotal,
            total: item.total
          }))
        )
        .execute();

      await trx
        .insertInto('order_logs')
        .values({
          order_id: orderId,
          event_type: 'UPDATE',
          description: 'Orden editada en escritorio'
        })
        .execute();

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'ORDER_UPDATE',
          entity_type: 'order',
          entity_id: String(orderId),
          details_json: JSON.stringify({
            clientId: parsed.clientId,
            subtotal,
            discountTotal: parsed.discountTotal,
            total,
            balanceDue
          })
        })
        .execute();
    });

    return detail(orderId);
  };

  const cancel = async (orderId: number): Promise<{ success: true }> => {
    const order = await db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!order) {
      throw new Error('Orden no encontrada.');
    }

    const deliveriesCount = await db
      .selectFrom('delivery_records')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('order_id', '=', orderId)
      .executeTakeFirstOrThrow();

    if (Number(deliveriesCount.count ?? 0) > 0) {
      throw new Error('No puedes cancelar una orden ya entregada.');
    }

    const cancelStatus = await db
      .selectFrom('order_statuses')
      .selectAll()
      .where('code', 'in', ['CANCELLED', 'CANCELED', 'CANCELADO'])
      .orderBy('id')
      .executeTakeFirst();

    if (!cancelStatus) {
      throw new Error('No existe un estado de cancelación configurado.');
    }

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('orders')
        .set({
          status_id: cancelStatus.id
        })
        .where('id', '=', orderId)
        .execute();

      await trx
        .insertInto('order_status_history')
        .values({
          order_id: orderId,
          status_id: cancelStatus.id,
          notes: 'Orden cancelada manualmente'
        })
        .execute();

      await trx
        .insertInto('order_logs')
        .values({
          order_id: orderId,
          event_type: 'CANCEL',
          description: 'Orden cancelada en escritorio'
        })
        .execute();

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'ORDER_CANCEL',
          entity_type: 'order',
          entity_id: String(orderId),
          details_json: JSON.stringify({
            orderId,
            statusId: cancelStatus.id,
            statusName: cancelStatus.name
          })
        })
        .execute();
    });

    return { success: true };
  };

  const updateStatus = async (
    orderId: number,
    statusId: number
  ): Promise<{ success: true }> => {
    const status = await db
      .selectFrom('order_statuses')
      .selectAll()
      .where('id', '=', statusId)
      .executeTakeFirst();

    if (!status) {
      throw new Error('Estado no encontrado.');
    }

    const order = await db
      .selectFrom('orders')
      .select(['id'])
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (!order) {
      throw new Error('Orden no encontrada.');
    }

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('orders')
        .set({
          status_id: statusId
        })
        .where('id', '=', orderId)
        .execute();

      await trx
        .insertInto('order_status_history')
        .values({
          order_id: orderId,
          status_id: statusId,
          notes: `Cambio manual a ${status.name}`
        })
        .execute();

      await trx
        .insertInto('order_logs')
        .values({
          order_id: orderId,
          event_type: 'STATUS_CHANGE',
          description: `Estado actualizado a ${status.name}`
        })
        .execute();

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'ORDER_STATUS_UPDATE',
          entity_type: 'order',
          entity_id: String(orderId),
          details_json: JSON.stringify({
            orderId,
            statusId,
            statusCode: status.code,
            statusName: status.name
          })
        })
        .execute();

      if (statusId === 7) {
        const existing = await trx
          .selectFrom('warranties')
          .select(['id'])
          .where('order_id', '=', orderId)
          .executeTakeFirst();

        if (!existing) {
          let warrantyStatus = await trx
            .selectFrom('warranty_statuses')
            .select(['id'])
            .where('code', '=', 'OPEN')
            .executeTakeFirst();

          if (!warrantyStatus) {
            const inserted = await trx
              .insertInto('warranty_statuses')
              .values({
                code: 'OPEN',
                name: 'Abierta',
                color: 'amber'
              })
              .executeTakeFirstOrThrow();

            warrantyStatus = { id: Number(inserted.insertId) };
          }

          await trx
            .insertInto('warranties')
            .values({
              order_id: orderId,
              status_id: warrantyStatus.id,
              reason: `Garantía automática orden ${orderId}`,
              resolution: null
            })
            .execute();
        }
      }
    });

    return { success: true };
  };

  return {
    async dashboard(): Promise<DashboardSummary> {
      const [
        clients,
        openOrders,
        dailySales,
        pendingBalance,
        openWarranties,
        dailyExpenses,
        recentOrders,
        paymentBreakdown
      ] = await Promise.all([
        db
          .selectFrom('clients')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .executeTakeFirstOrThrow(),

        db
          .selectFrom('orders')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .where('balance_due', '>', 0)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom('payments')
          .select((eb) => eb.fn.sum<number>('amount').as('sum'))
          .where('created_at', '>=', new Date(new Date().toDateString()))
          .executeTakeFirst(),

        db
          .selectFrom('orders')
          .select((eb) => eb.fn.sum<number>('balance_due').as('sum'))
          .executeTakeFirst(),

        db
          .selectFrom('warranties')
          .select((eb) => eb.fn.count<number>('id').as('count'))
          .executeTakeFirst(),

        db
          .selectFrom('expenses')
          .select((eb) => eb.fn.sum<number>('amount').as('sum'))
          .where('created_at', '>=', new Date(new Date().toDateString()))
          .executeTakeFirst(),

        repository.list(),

        db
          .selectFrom('payments as p')
          .innerJoin('payment_methods as pm', 'pm.id', 'p.payment_method_id')
          .select([
            sql<string>`pm.name`.as('method_name'),
            (eb) => eb.fn.sum<number>('p.amount').as('amount')
          ])
          .where('p.created_at', '>=', new Date(new Date().toDateString()))
          .groupBy('pm.name')
          .execute()
      ]);

      return {
        clients: Number(clients.count ?? 0),
        openOrders: Number(openOrders.count ?? 0),
        dailySales: Number(dailySales?.sum ?? 0),
        pendingBalance: Number(pendingBalance?.sum ?? 0),
        openWarranties: Number(openWarranties?.count ?? 0),
        dailyExpenses: Number(dailyExpenses?.sum ?? 0),
        recentOrders: recentOrders.slice(0, 5).map(mapOrder),
        paymentBreakdown: paymentBreakdown.map((item) => ({
          methodName: item.method_name,
          amount: Number(item.amount ?? 0)
        }))
      };
    },

    async catalogs(): Promise<CatalogsPayload> {
      const [statuses, paymentMethods, services] = await Promise.all([
        db
          .selectFrom('order_statuses')
          .select(['id', 'code', 'name', 'color'])
          .orderBy('id')
          .execute(),

        db
          .selectFrom('payment_methods')
          .select(['id', 'code', 'name'])
          .where('is_active', '=', 1)
          .orderBy('id')
          .execute(),

        db
          .selectFrom('services')
          .select(['id', 'category_id', 'name', 'base_price', 'is_active'])
          .where('is_active', '=', 1)
          .orderBy('name')
          .execute()
      ]);

      return {
        statuses,
        paymentMethods,
        services: services.map((service) => ({
          id: service.id,
          categoryId: service.category_id ?? null,
          name: service.name,
          basePrice: Number(service.base_price ?? 0),
          isActive: Boolean(service.is_active)
        }))
      };
    },

    async list(): Promise<Order[]> {
      return (await repository.list()).map(mapOrder);
    },

    detail,
    create,
    update,
    cancel,
    updateStatus
  };
};