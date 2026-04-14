"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReportsService = void 0;
const kysely_1 = require("kysely");
const startOfDay = (value) => new Date(`${value}T00:00:00`);
const endOfDay = (value) => new Date(`${value}T23:59:59`);
const createReportsService = (db) => ({
    async summary(from, to) {
        const orderQuery = db.selectFrom('orders as o');
        const paymentQuery = db
            .selectFrom('payments as p')
            .innerJoin('payment_methods as pm', 'pm.id', 'p.payment_method_id');
        const expenseQuery = db.selectFrom('expenses as e');
        const orderFiltered = from && to
            ? orderQuery
                .where('o.created_at', '>=', startOfDay(from))
                .where('o.created_at', '<=', endOfDay(to))
            : from
                ? orderQuery.where('o.created_at', '>=', startOfDay(from))
                : to
                    ? orderQuery.where('o.created_at', '<=', endOfDay(to))
                    : orderQuery;
        const paymentFiltered = from && to
            ? paymentQuery
                .where('p.created_at', '>=', startOfDay(from))
                .where('p.created_at', '<=', endOfDay(to))
            : from
                ? paymentQuery.where('p.created_at', '>=', startOfDay(from))
                : to
                    ? paymentQuery.where('p.created_at', '<=', endOfDay(to))
                    : paymentQuery;
        const expenseFiltered = from && to
            ? expenseQuery
                .where('e.expense_date', '>=', new Date(from))
                .where('e.expense_date', '<=', new Date(to))
            : from
                ? expenseQuery.where('e.expense_date', '>=', new Date(from))
                : to
                    ? expenseQuery.where('e.expense_date', '<=', new Date(to))
                    : expenseQuery;
        const [totalSalesRow, totalPaymentsRow, totalExpensesRow, totalOrdersRow, paymentMethods, orderStatuses] = await Promise.all([
            orderFiltered
                .select((eb) => eb.fn.sum('o.total').as('sum'))
                .executeTakeFirst(),
            paymentFiltered
                .select((eb) => eb.fn.sum('p.amount').as('sum'))
                .executeTakeFirst(),
            expenseFiltered
                .select((eb) => eb.fn.sum('e.amount').as('sum'))
                .executeTakeFirst(),
            orderFiltered
                .select((eb) => eb.fn.count('o.id').as('count'))
                .executeTakeFirst(),
            paymentFiltered
                .select([
                (0, kysely_1.sql) `pm.name`.as('method_name'),
                (eb) => eb.fn.sum('p.amount').as('amount'),
                (eb) => eb.fn.count('p.id').as('count')
            ])
                .groupBy('pm.name')
                .orderBy('amount desc')
                .execute(),
            orderFiltered
                .innerJoin('order_statuses as os', 'os.id', 'o.status_id')
                .select([
                (0, kysely_1.sql) `os.name`.as('status_name'),
                (eb) => eb.fn.count('o.id').as('count'),
                (eb) => eb.fn.sum('o.total').as('total')
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
exports.createReportsService = createReportsService;
