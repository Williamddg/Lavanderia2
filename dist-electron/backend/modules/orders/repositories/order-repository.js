"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderRepository = void 0;
const kysely_1 = require("kysely");
const baseOrderSelection = [
    'o.id',
    'o.order_number',
    'o.client_id',
    'o.status_id',
    'o.notes',
    'o.subtotal',
    'o.discount_total',
    'o.total',
    'o.paid_total',
    'o.balance_due',
    'o.due_date',
    'o.created_at',
    (0, kysely_1.sql) `CONCAT(c.first_name, ' ', c.last_name)`.as('client_name'),
    (0, kysely_1.sql) `s.name`.as('status_name'),
    (0, kysely_1.sql) `s.color`.as('status_color')
];
const createOrderRepository = (db) => ({
    list: () => db
        .selectFrom('orders as o')
        .innerJoin('clients as c', 'c.id', 'o.client_id')
        .innerJoin('order_statuses as s', 's.id', 'o.status_id')
        .select(baseOrderSelection)
        .orderBy('o.id desc')
        .execute(),
    findById: (id) => db
        .selectFrom('orders as o')
        .innerJoin('clients as c', 'c.id', 'o.client_id')
        .innerJoin('order_statuses as s', 's.id', 'o.status_id')
        .select(baseOrderSelection)
        .where('o.id', '=', id)
        .executeTakeFirst(),
    findItems: (orderId) => db.selectFrom('order_items').selectAll().where('order_id', '=', orderId).orderBy('id').execute()
});
exports.createOrderRepository = createOrderRepository;
