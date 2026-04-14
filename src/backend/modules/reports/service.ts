import { sql, type Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { ReportsSummary } from '../../../shared/types.js';

const startOfDay = (value: string) => new Date(`${value}T00:00:00`);
const endOfDay = (value: string) => new Date(`${value}T23:59:59`);

export const createReportsService = (db: Kysely<Database>) => ({
  async summary(from?: string, to?: string): Promise<ReportsSummary> {
    const orderQuery = db.selectFrom('orders as o');
    const paymentQuery = db
      .selectFrom('payments as p')
      .innerJoin('payment_methods as pm', 'pm.id', 'p.payment_method_id');
    const expenseQuery = db.selectFrom('expenses as e');

    const orderFiltered =
      from && to
        ? orderQuery
            .where('o.created_at', '>=', startOfDay(from))
            .where('o.created_at', '<=', endOfDay(to))
        : from
          ? orderQuery.where('o.created_at', '>=', startOfDay(from))
          : to
            ? orderQuery.where('o.created_at', '<=', endOfDay(to))
            : orderQuery;

    const paymentFiltered =
      from && to
        ? paymentQuery
            .where('p.created_at', '>=', startOfDay(from))
            .where('p.created_at', '<=', endOfDay(to))
        : from
          ? paymentQuery.where('p.created_at', '>=', startOfDay(from))
          : to
            ? paymentQuery.where('p.created_at', '<=', endOfDay(to))
            : paymentQuery;

    const expenseFiltered =
      from && to
        ? expenseQuery
            .where('e.expense_date', '>=', new Date(from))
            .where('e.expense_date', '<=', new Date(to))
        : from
          ? expenseQuery.where('e.expense_date', '>=', new Date(from))
          : to
            ? expenseQuery.where('e.expense_date', '<=', new Date(to))
            : expenseQuery;

    const [
      totalSalesRow,
      totalPaymentsRow,
      totalExpensesRow,
      totalOrdersRow,
      paymentMethods,
      orderStatuses
    ] = await Promise.all([
      orderFiltered
        .select((eb) => eb.fn.sum<number>('o.total').as('sum'))
        .executeTakeFirst(),

      paymentFiltered
        .select((eb) => eb.fn.sum<number>('p.amount').as('sum'))
        .executeTakeFirst(),

      expenseFiltered
        .select((eb) => eb.fn.sum<number>('e.amount').as('sum'))
        .executeTakeFirst(),

      orderFiltered
        .select((eb) => eb.fn.count<number>('o.id').as('count'))
        .executeTakeFirst(),

      paymentFiltered
        .select([
          sql<string>`pm.name`.as('method_name'),
          (eb) => eb.fn.sum<number>('p.amount').as('amount'),
          (eb) => eb.fn.count<number>('p.id').as('count')
        ])
        .groupBy('pm.name')
        .orderBy('amount desc')
        .execute(),

      orderFiltered
        .innerJoin('order_statuses as os', 'os.id', 'o.status_id')
        .select([
          sql<string>`os.name`.as('status_name'),
          (eb) => eb.fn.count<number>('o.id').as('count'),
          (eb) => eb.fn.sum<number>('o.total').as('total')
        ])
        .groupBy('os.name')
        .orderBy('count desc')
        .execute()
    ]);

    const totalSales = Number(totalSalesRow?.sum ?? 0);
    const totalExpenses = Number(totalExpensesRow?.sum ?? 0);

    return {
      from: from ?? null,
      to: to ?? null,
      totalSales,
      totalExpenses,
      netUtility: totalSales - totalExpenses,
      totalPayments: Number(totalPaymentsRow?.sum ?? 0),
      totalOrders: Number(totalOrdersRow?.count ?? 0),
      paymentMethods: paymentMethods.map((item) => ({
        methodName: item.method_name,
        amount: Number(item.amount ?? 0),
        count: Number(item.count ?? 0)
      })),
      orderStatuses: orderStatuses.map((item) => ({
        statusName: item.status_name,
        count: Number(item.count ?? 0),
        total: Number(item.total ?? 0)
      }))
    };
  }
});