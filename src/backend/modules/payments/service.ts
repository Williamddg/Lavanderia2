import { z } from 'zod';
import { sql, type Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { Payment, PaymentInput } from '../../../shared/types.js';

const schema = z.object({
  orderId: z.number().positive(),
  paymentMethodId: z.number().positive(),
  amount: z.number().positive(),
  reference: z.string().nullable()
});

const mapPayment = (row: any): Payment => ({
  id: row.id,
  orderId: row.order_id,
  invoiceId: row.invoice_id,
  paymentMethodId: row.payment_method_id,
  paymentMethodName: row.payment_method_name,
  amount: Number(row.amount),
  reference: row.reference,
  createdAt: new Date(row.created_at).toISOString()
});

export const createPaymentsService = (db: Kysely<Database>) => {
  const list = async (orderId?: number): Promise<Payment[]> => {
    let query = db
      .selectFrom('payments as p')
      .innerJoin('payment_methods as pm', 'pm.id', 'p.payment_method_id')
      .select([
        'p.id',
        'p.order_id',
        'p.invoice_id',
        'p.payment_method_id',
        'p.amount',
        'p.reference',
        'p.created_at',
        sql<string>`pm.name`.as('payment_method_name')
      ])
      .orderBy('p.id desc');

    if (orderId) {
      query = query.where('p.order_id', '=', orderId);
    }

    return (await query.execute()).map(mapPayment);
  };

  const create = async (input: PaymentInput): Promise<Payment> => {
    const parsed = schema.parse(input);

    const order = await db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', parsed.orderId)
      .executeTakeFirstOrThrow();

    const newPaidTotal = Number(order.paid_total) + parsed.amount;
    const newBalance = Math.max(0, Number(order.total) - newPaidTotal);

    const result = await db.transaction().execute(async (trx) => {
      const inserted = await trx
        .insertInto('payments')
        .values({
          order_id: parsed.orderId,
          payment_method_id: parsed.paymentMethodId,
          amount: parsed.amount,
          reference: parsed.reference
        })
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('orders')
        .set({
          paid_total: newPaidTotal,
          balance_due: newBalance
        })
        .where('id', '=', parsed.orderId)
        .execute();

      if (newBalance <= 0) {
        const readyStatus = await trx
  .selectFrom('order_statuses')
  .selectAll()
  .where('code', '=', 'READY_FOR_DELIVERY')
  .executeTakeFirst();

        if (readyStatus && order.status_id !== readyStatus.id) {
          await trx
            .updateTable('orders')
            .set({ status_id: readyStatus.id })
            .where('id', '=', parsed.orderId)
            .execute();

          await trx
            .insertInto('order_status_history')
            .values({
              order_id: parsed.orderId,
              status_id: readyStatus.id,
              notes: 'Estado automático: orden pagada completamente'
            })
            .execute();

          await trx
            .insertInto('order_logs')
            .values({
              order_id: parsed.orderId,
              event_type: 'AUTO_STATUS_CHANGE',
              description: `Estado automático a ${readyStatus.name}`
            })
            .execute();

          await trx
            .insertInto('audit_logs')
            .values({
              action: 'ORDER_AUTO_STATUS_UPDATE',
              entity_type: 'order',
              entity_id: String(parsed.orderId),
              details_json: JSON.stringify({
                orderId: parsed.orderId,
                newStatus: readyStatus.name
              })
            })
            .execute();
        }
      }

      const activeCashSession = await trx
        .selectFrom('cash_sessions')
        .selectAll()
        .where('status', '=', 'open')
        .orderBy('id desc')
        .executeTakeFirst();

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'PAYMENT_CASH_SESSION_CHECK',
          entity_type: 'payment',
          entity_id: String(inserted.insertId),
          details_json: JSON.stringify({
            activeCashSessionFound: Boolean(activeCashSession),
            cashSessionId: activeCashSession?.id ?? null
          })
        })
        .execute();

      if (activeCashSession) {
        const paymentMethod = await trx
          .selectFrom('payment_methods')
          .select(['name'])
          .where('id', '=', parsed.paymentMethodId)
          .executeTakeFirst();

        await trx
          .insertInto('cash_movements')
          .values({
            cash_session_id: activeCashSession.id,
            movement_type: 'PAYMENT_IN',
            amount: parsed.amount,
            notes: `Pago orden #${parsed.orderId} · ${paymentMethod?.name ?? 'Método desconocido'}${parsed.reference ? ` · Ref: ${parsed.reference}` : ''}`,
            created_by: 1
          })
          .executeTakeFirstOrThrow();

        await trx
          .insertInto('audit_logs')
          .values({
            action: 'CASH_MOVEMENT_CREATE',
            entity_type: 'cash_session',
            entity_id: String(activeCashSession.id),
            details_json: JSON.stringify({
              orderId: parsed.orderId,
              amount: parsed.amount,
              paymentMethodId: parsed.paymentMethodId
            })
          })
          .execute();
      }

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'PAYMENT_CREATE',
          entity_type: 'payment',
          entity_id: String(inserted.insertId),
          details_json: JSON.stringify(parsed)
        })
        .execute();

      return inserted;
    });

    return (await list(parsed.orderId)).find(
      (payment) => payment.id === Number(result.insertId)
    ) as Payment;
  };

  return { list, create };
};