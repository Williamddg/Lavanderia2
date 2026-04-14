import { z } from 'zod';
import { sql, type Kysely } from 'kysely';
import type { Database } from '../../db/schema.js';
import type { Expense, ExpenseInput } from '../../../shared/types.js';

const expenseSchema = z.object({
  categoryId: z.number().positive(),
  amount: z.number().positive(),
  description: z.string().trim().min(3),
  expenseDate: z.string().min(1)
});




const mapExpense = (row: any): Expense => ({
  id: row.id,
  cashSessionId: row.cash_session_id ?? null,
  categoryId: row.category_id,
  categoryName: row.category_name,
  amount: Number(row.amount),
  description: row.description,
  expenseDate:
    row.expense_date instanceof Date
      ? row.expense_date.toISOString().slice(0, 10)
      : String(row.expense_date),
  createdBy: row.created_by ?? null,
  createdAt: new Date(row.created_at).toISOString()
});

export const createExpensesService = (db: Kysely<Database>) => {
  
  const listCategories = async () => {
  const rows = await db
    .selectFrom('expense_categories')
    .selectAll()
    .where('is_active', '=', 1)
    .orderBy('name')
    .execute();

  return rows.map((r) => ({
    id: r.id,
    name: r.name
  }));
};  
  const list = async () => {
  const rows = await db
    .selectFrom('expenses as e')
    .innerJoin('expense_categories as c', 'c.id', 'e.category_id')
    .select([
      'e.id',
      'e.cash_session_id',
      'e.category_id',
      'e.amount',
      'e.description',
      'e.expense_date',
      'e.created_by',
      'e.created_at',
      sql<string>`c.name`.as('category_name') // 🔥 ESTE ES EL IMPORTANTE
    ])
    .orderBy('e.id desc')
    .execute();

  return rows.map(mapExpense);
};

  const create = async (input: ExpenseInput): Promise<Expense> => {
    const parsed = expenseSchema.parse(input);

    const activeCashSession = await db
      .selectFrom('cash_sessions')
      .select(['id'])
      .where('status', '=', 'open')
      .orderBy('id desc')
      .executeTakeFirst();

    const inserted = await db.transaction().execute(async (trx) => {
      const result = await trx
        .insertInto('expenses')
        .values({
          cash_session_id: activeCashSession?.id ?? null,
          category_id: parsed.categoryId,
          amount: parsed.amount,
          description: parsed.description,
          expense_date: new Date(parsed.expenseDate),
          created_by: 1
        })
        .executeTakeFirstOrThrow();

      if (activeCashSession) {
        await trx
          .insertInto('cash_movements')
          .values({
            cash_session_id: activeCashSession.id,
            movement_type: 'EXPENSE_OUT',
            amount: parsed.amount,
            notes: `Gasto: ${parsed.description}`,
            created_by: 1
          })
          .execute();
      }

      await trx
        .insertInto('audit_logs')
        .values({
          action: 'EXPENSE_CREATE',
          entity_type: 'expense',
          entity_id: String(result.insertId),
          details_json: JSON.stringify({
            categoryId: parsed.categoryId,
            amount: parsed.amount,
            description: parsed.description,
            expenseDate: parsed.expenseDate,
            cashSessionId: activeCashSession?.id ?? null
          })
        })
        .execute();

      return result;
    });

    const row = await db
      .selectFrom('expenses')
      .selectAll()
      .where('id', '=', Number(inserted.insertId))
      .executeTakeFirstOrThrow();

    return mapExpense(row);
  };

  return {
    list,
    create,
    listCategories
  };
};