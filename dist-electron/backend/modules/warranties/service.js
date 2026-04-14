"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWarrantiesService = void 0;
const zod_1 = require("zod");
const kysely_1 = require("kysely");
const createSchema = zod_1.z.object({
    orderId: zod_1.z.number().positive(),
    reason: zod_1.z.string().trim().min(3)
});
const updateSchema = zod_1.z.object({
    statusId: zod_1.z.number().positive(),
    resolution: zod_1.z.string().nullable()
});
const mapWarranty = (row) => ({
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    clientName: row.client_name,
    statusId: row.status_id,
    statusCode: row.status_code,
    statusName: row.status_name,
    statusColor: row.status_color,
    reason: row.reason,
    resolution: row.resolution ?? null,
    createdAt: new Date(row.created_at).toISOString()
});
const createWarrantiesService = (db) => {
    const listStatuses = async () => {
        const rows = await db
            .selectFrom('warranty_statuses')
            .select(['id', 'code', 'name', 'color'])
            .orderBy('id')
            .execute();
        return rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            color: row.color
        }));
    };
    const list = async () => {
        const rows = await db
            .selectFrom('warranties as w')
            .innerJoin('orders as o', 'o.id', 'w.order_id')
            .innerJoin('clients as c', 'c.id', 'o.client_id')
            .innerJoin('warranty_statuses as ws', 'ws.id', 'w.status_id')
            .select([
            'w.id',
            'w.order_id',
            'w.status_id',
            'w.reason',
            'w.resolution',
            'w.created_at',
            'o.order_number',
            (0, kysely_1.sql) `CONCAT(c.first_name, ' ', c.last_name)`.as('client_name'),
            'ws.code as status_code',
            'ws.name as status_name',
            'ws.color as status_color'
        ])
            .orderBy('w.id desc')
            .execute();
        return rows.map(mapWarranty);
    };
    const create = async (input) => {
        const parsed = createSchema.parse(input);
        const order = await db
            .selectFrom('orders')
            .select(['id', 'order_number'])
            .where('id', '=', parsed.orderId)
            .executeTakeFirst();
        if (!order) {
            throw new Error('Orden no encontrada.');
        }
        const openStatus = await db
            .selectFrom('warranty_statuses')
            .selectAll()
            .where('code', '=', 'OPEN')
            .executeTakeFirst();
        if (!openStatus) {
            throw new Error('No existe el estado OPEN en warranty_statuses.');
        }
        const existingOpen = await db
            .selectFrom('warranties as w')
            .innerJoin('warranty_statuses as ws', 'ws.id', 'w.status_id')
            .select(['w.id'])
            .where('w.order_id', '=', parsed.orderId)
            .where('ws.code', 'not in', ['RESOLVED', 'CLOSED', 'CERRADA', 'RESUELTA'])
            .executeTakeFirst();
        if (existingOpen) {
            throw new Error('Esa orden ya tiene una garantía abierta.');
        }
        const result = await db.transaction().execute(async (trx) => {
            const inserted = await trx
                .insertInto('warranties')
                .values({
                order_id: parsed.orderId,
                status_id: openStatus.id,
                reason: parsed.reason,
                resolution: null
            })
                .executeTakeFirstOrThrow();
            await trx
                .insertInto('audit_logs')
                .values({
                action: 'WARRANTY_CREATE',
                entity_type: 'warranty',
                entity_id: String(inserted.insertId),
                details_json: JSON.stringify({
                    orderId: parsed.orderId,
                    reason: parsed.reason
                })
            })
                .execute();
            return inserted;
        });
        const created = await db
            .selectFrom('warranties as w')
            .innerJoin('orders as o', 'o.id', 'w.order_id')
            .innerJoin('clients as c', 'c.id', 'o.client_id')
            .innerJoin('warranty_statuses as ws', 'ws.id', 'w.status_id')
            .select([
            'w.id',
            'w.order_id',
            'w.status_id',
            'w.reason',
            'w.resolution',
            'w.created_at',
            'o.order_number',
            (0, kysely_1.sql) `CONCAT(c.first_name, ' ', c.last_name)`.as('client_name'),
            'ws.code as status_code',
            'ws.name as status_name',
            'ws.color as status_color'
        ])
            .where('w.id', '=', Number(result.insertId))
            .executeTakeFirstOrThrow();
        return mapWarranty(created);
    };
    const updateStatus = async (id, input) => {
        const parsed = updateSchema.parse(input);
        const warranty = await db
            .selectFrom('warranties')
            .select(['id'])
            .where('id', '=', id)
            .executeTakeFirst();
        if (!warranty) {
            throw new Error('Garantía no encontrada.');
        }
        const status = await db
            .selectFrom('warranty_statuses')
            .selectAll()
            .where('id', '=', parsed.statusId)
            .executeTakeFirst();
        if (!status) {
            throw new Error('Estado de garantía no encontrado.');
        }
        await db.transaction().execute(async (trx) => {
            await trx
                .updateTable('warranties')
                .set({
                status_id: parsed.statusId,
                resolution: parsed.resolution ?? null
            })
                .where('id', '=', id)
                .execute();
            await trx
                .insertInto('audit_logs')
                .values({
                action: 'WARRANTY_STATUS_UPDATE',
                entity_type: 'warranty',
                entity_id: String(id),
                details_json: JSON.stringify({
                    warrantyId: id,
                    statusId: parsed.statusId,
                    statusCode: status.code,
                    resolution: parsed.resolution ?? null
                })
            })
                .execute();
        });
        const updated = await db
            .selectFrom('warranties as w')
            .innerJoin('orders as o', 'o.id', 'w.order_id')
            .innerJoin('clients as c', 'c.id', 'o.client_id')
            .innerJoin('warranty_statuses as ws', 'ws.id', 'w.status_id')
            .select([
            'w.id',
            'w.order_id',
            'w.status_id',
            'w.reason',
            'w.resolution',
            'w.created_at',
            'o.order_number',
            (0, kysely_1.sql) `CONCAT(c.first_name, ' ', c.last_name)`.as('client_name'),
            'ws.code as status_code',
            'ws.name as status_name',
            'ws.color as status_color'
        ])
            .where('w.id', '=', id)
            .executeTakeFirstOrThrow();
        return mapWarranty(updated);
    };
    return {
        list,
        listStatuses,
        create,
        updateStatus
    };
};
exports.createWarrantiesService = createWarrantiesService;
