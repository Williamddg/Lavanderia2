"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientsService = void 0;
const zod_1 = require("zod");
const client_repository_js_1 = require("./repositories/client-repository.js");
const schema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(2),
    lastName: zod_1.z.string().trim().min(2),
    phone: zod_1.z.string().trim().min(7),
    email: zod_1.z.string().trim().email().nullable().or(zod_1.z.literal('')).transform((value) => value || null),
    address: zod_1.z.string().trim().nullable().or(zod_1.z.literal('')).transform((value) => value || null),
    notes: zod_1.z.string().trim().nullable().or(zod_1.z.literal('')).transform((value) => value || null)
});
const mapClient = (row) => ({
    id: row.id,
    code: row.code,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at.toISOString()
});
const createClientsService = (db) => {
    const repository = (0, client_repository_js_1.createClientRepository)(db);
    return {
        async list() {
            return (await repository.list()).map(mapClient);
        },
        async create(input) {
            const parsed = schema.parse(input);
            const count = await repository.count();
            const code = `CLI-${String(Number(count.count) + 1).padStart(5, '0')}`;
            const result = await db.insertInto('clients').values({
                code,
                first_name: parsed.firstName,
                last_name: parsed.lastName,
                phone: parsed.phone,
                email: parsed.email,
                address: parsed.address,
                notes: parsed.notes
            }).executeTakeFirstOrThrow();
            const row = await repository.findById(Number(result.insertId));
            await db.insertInto('audit_logs').values({ action: 'CLIENT_CREATE', entity_type: 'client', entity_id: String(result.insertId), details_json: JSON.stringify(parsed) }).execute();
            if (!row)
                throw new Error('No fue posible recuperar el cliente creado.');
            return mapClient(row);
        },
        async update(id, input) {
            const parsed = schema.parse(input);
            await repository.update(id, {
                first_name: parsed.firstName,
                last_name: parsed.lastName,
                phone: parsed.phone,
                email: parsed.email,
                address: parsed.address,
                notes: parsed.notes
            });
            const row = await repository.findById(id);
            await db.insertInto('audit_logs').values({ action: 'CLIENT_UPDATE', entity_type: 'client', entity_id: String(id), details_json: JSON.stringify(parsed) }).execute();
            if (!row)
                throw new Error('Cliente no encontrado.');
            return mapClient(row);
        },
        async remove(id) {
            await repository.delete(id);
            await db.insertInto('audit_logs').values({ action: 'CLIENT_DELETE', entity_type: 'client', entity_id: String(id) }).execute();
            return { id };
        }
    };
};
exports.createClientsService = createClientsService;
