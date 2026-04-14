import { databaseManager } from './database-manager.js';
import type { Service, ServiceInput } from '../../shared/types.js';

const mapServiceRow = (row: any): Service => ({
  id: row.id,
  categoryId: row.category_id ?? null,
  name: row.name,
  basePrice: Number(row.base_price ?? 0),
  isActive: Boolean(row.is_active)
});

class ServicesManager {
  async list(activeOnly = false): Promise<Service[]> {
    const db = await databaseManager.getDb();

    let query = db
      .selectFrom('services')
      .selectAll()
      .orderBy('name', 'asc');

    if (activeOnly) {
      query = query.where('is_active', '=', 1);
    }

    const rows = await query.execute();
    return rows.map(mapServiceRow);
  }

  async create(input: ServiceInput): Promise<Service> {
    const db = await databaseManager.getDb();

    const result = await db
      .insertInto('services')
      .values({
        category_id: input.categoryId ?? null,
        name: input.name.trim(),
        base_price: input.basePrice,
        is_active: input.isActive ? 1 : 0
      })
      .executeTakeFirst();

    const id = Number(result.insertId);
    const row = await db
      .selectFrom('services')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    return mapServiceRow(row);
  }

  async update(id: number, input: ServiceInput): Promise<Service> {
    const db = await databaseManager.getDb();

    await db
      .updateTable('services')
      .set({
        category_id: input.categoryId ?? null,
        name: input.name.trim(),
        base_price: input.basePrice,
        is_active: input.isActive ? 1 : 0
      })
      .where('id', '=', id)
      .execute();

    const row = await db
      .selectFrom('services')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    return mapServiceRow(row);
  }

  async remove(id: number) {
    const db = await databaseManager.getDb();

    await db
      .updateTable('services')
      .set({ is_active: 0 })
      .where('id', '=', id)
      .execute();

    return { success: true };
  }
}

export const servicesManager = new ServicesManager();