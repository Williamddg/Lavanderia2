"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeliveriesService = void 0;
const zod_1 = require("zod");
const kysely_1 = require("kysely");
const schema = zod_1.z.object({
    orderId: zod_1.z.number().positive(),
    deliveredTo: zod_1.z.string().trim().min(3, 'Debes ingresar el nombre de quien recibe.'),
    receiverDocument: zod_1.z.string().nullable().optional(),
    receiverPhone: zod_1.z.string().nullable().optional(),
    relationshipToClient: zod_1.z.string().nullable().optional(),
    receiverSignature: zod_1.z.string().nullable().optional(),
    ticketCode: zod_1.z.string().nullable().optional()
});
const mapDelivery = (row) => ({
    id: row.id,
    orderId: row.order_id,
    deliveredTo: row.delivered_to,
    receiverDocument: row.receiver_document,
    receiverPhone: row.receiver_phone,
    relationshipToClient: row.relationship_to_client,
    receiverSignature: row.receiver_signature,
    outstandingBalance: Number(row.outstanding_balance),
    ticketCode: row.ticket_code,
    createdAt: new Date(row.created_at).toISOString()
});
const createDeliveriesService = (db) => ({
    async list() {
        return (await db
            .selectFrom('delivery_records')
            .selectAll()
            .orderBy('id desc')
            .execute()).map(mapDelivery);
    },
    async create(input) {
        const parsed = schema.parse(input);
        const order = await db
            .selectFrom('orders as o')
            .innerJoin('order_statuses as s', 's.id', 'o.status_id')
            .select([
            'o.id',
            'o.balance_due',
            (0, kysely_1.sql) `s.code`.as('status_code')
        ])
            .where('o.id', '=', parsed.orderId)
            .executeTakeFirstOrThrow();
        if (order.status_code !== 'READY' && order.status_code !== 'READY_FOR_DELIVERY') {
            throw new Error('La orden no está lista para entrega.');
        }
        if (Number(order.balance_due) > 0) {
            throw new Error('No se puede entregar una orden con saldo pendiente.');
        }
        const inserted = await db.transaction().execute(async (trx) => {
            const result = await trx
                .insertInto('delivery_records')
                .values({
                order_id: parsed.orderId,
                delivered_to: parsed.deliveredTo.trim(),
                receiver_document: parsed.receiverDocument?.trim() || null,
                receiver_phone: parsed.receiverPhone?.trim() || null,
                relationship_to_client: parsed.relationshipToClient?.trim() || null,
                receiver_signature: parsed.receiverSignature?.trim() || null,
                outstanding_balance: 0,
                ticket_code: parsed.ticketCode?.trim() || ''
            })
                .executeTakeFirstOrThrow();
            const deliveredStatus = await trx
                .selectFrom('order_statuses')
                .select('id')
                .where('code', '=', 'DELIVERED')
                .executeTakeFirstOrThrow();
            await trx
                .updateTable('orders')
                .set({ status_id: deliveredStatus.id })
                .where('id', '=', parsed.orderId)
                .execute();
            await trx
                .insertInto('order_status_history')
                .values({
                order_id: parsed.orderId,
                status_id: deliveredStatus.id,
                notes: 'Orden entregada'
            })
                .execute();
            await trx
                .insertInto('order_logs')
                .values({
                order_id: parsed.orderId,
                event_type: 'DELIVERY',
                description: 'Entrega registrada'
            })
                .execute();
            await trx
                .insertInto('audit_logs')
                .values({
                action: 'DELIVERY_CREATE',
                entity_type: 'delivery',
                entity_id: String(result.insertId),
                details_json: JSON.stringify({
                    ...parsed,
                    receiverDocument: parsed.receiverDocument?.trim() || null,
                    receiverPhone: parsed.receiverPhone?.trim() || null,
                    relationshipToClient: parsed.relationshipToClient?.trim() || null,
                    receiverSignature: parsed.receiverSignature?.trim() || null,
                    ticketCode: parsed.ticketCode?.trim() || ''
                })
            })
                .execute();
            return result;
        });
        const row = await db
            .selectFrom('delivery_records')
            .selectAll()
            .where('id', '=', Number(inserted.insertId))
            .executeTakeFirstOrThrow();
        return mapDelivery(row);
    }
});
exports.createDeliveriesService = createDeliveriesService;
