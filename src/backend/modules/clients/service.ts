import { z } from 'zod';
import type { Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { Client, ClientInput } from '../../../shared/types.js';
import { createClientRepository } from './repositories/client-repository.js';

const schema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().nullable().or(z.literal('')).transform((value) => value || null),
  address: z.string().trim().nullable().or(z.literal('')).transform((value) => value || null),
  notes: z.string().trim().nullable().or(z.literal('')).transform((value) => value || null)
});

const mapClient = (row: { id: number; code: string; first_name: string; last_name: string; phone: string; email: string | null; address: string | null; notes: string | null; created_at: Date; }): Client => ({
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

export const createClientsService = (db: Kysely<Database>) => {
  const repository = createClientRepository(db);

  return {
    async list(): Promise<Client[]> {
      return (await repository.list()).map(mapClient);
    },

    async create(input: ClientInput): Promise<Client> {
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
      if (!row) throw new Error('No fue posible recuperar el cliente creado.');
      return mapClient(row);
    },

    async update(id: number, input: ClientInput): Promise<Client> {
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
      if (!row) throw new Error('Cliente no encontrado.');
      return mapClient(row);
    },

    async remove(id: number) {
      await repository.delete(id);
      await db.insertInto('audit_logs').values({ action: 'CLIENT_DELETE', entity_type: 'client', entity_id: String(id) }).execute();
      return { id };
    }
  };
};
