import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpenseInput } from '@shared/types';
import { api } from '@renderer/services/api';
import { Button, DataTable, Input, Modal, PageHeader } from '@renderer/ui/components';
import { currency, dateTime } from '@renderer/utils/format';

const emptyForm: ExpenseInput = {
  categoryId: 0,
  amount: 0,
  description: '',
  expenseDate: new Date().toISOString().slice(0, 10)
};

export const ExpensesPage = () => {
  const queryClient = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: api.listExpenses
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: api.listExpenseCategories
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseInput>(emptyForm);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: async () => {
      setOpen(false);
      setForm({
        ...emptyForm,
        categoryId: categories[0]?.id ?? 0
      });
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        expense.description.toLowerCase().includes(term) ||
        String(expense.amount).includes(term) ||
        String(expense.categoryName ?? expense.categoryId).toLowerCase().includes(term);

      const matchesFrom = !dateFrom || expense.expenseDate >= dateFrom;
      const matchesTo = !dateTo || expense.expenseDate <= dateTo;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [expenses, search, dateFrom, dateTo]);

  const handleOpenModal = () => {
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? 0
    });
    setFormError('');
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? 0
    });
    setFormError('');
  };

  const handleSubmit = () => {
    const payload: ExpenseInput = {
      categoryId: Number(form.categoryId || 0),
      amount: Number(form.amount || 0),
      description: form.description.trim(),
      expenseDate: form.expenseDate
    };

    if (!payload.categoryId) {
      setFormError('Debes seleccionar una categoría.');
      return;
    }

    if (payload.amount <= 0) {
      setFormError('Debes ingresar un monto mayor que cero.');
      return;
    }

    if (!payload.description) {
      setFormError('Debes escribir una descripción.');
      return;
    }

    if (!payload.expenseDate) {
      setFormError('Debes seleccionar la fecha del gasto.');
      return;
    }

    setFormError('');
    createMutation.mutate(payload);
  };

  return (
    <section className="stack-gap">
      <PageHeader
        title="Gastos"
        subtitle="Registro y control de gastos del negocio."
        actions={<Button onClick={handleOpenModal}>Nuevo gasto</Button>}
      />

      <div className="card-panel stack-gap">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="Buscar por descripción o categoría"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <DataTable
          rows={filteredExpenses}
          columns={[
            {
              key: 'expenseDate',
              header: 'Fecha gasto',
              render: (row) => row.expenseDate
            },
            {
              key: 'category',
              header: 'Categoría',
              render: (row) => row.categoryName || `#${row.categoryId}`
            },
            {
              key: 'description',
              header: 'Descripción',
              render: (row) => row.description
            },
            {
              key: 'amount',
              header: 'Monto',
              render: (row) => currency(row.amount)
            },
            {
              key: 'createdAt',
              header: 'Registrado',
              render: (row) => dateTime(row.createdAt)
            }
          ]}
        />
      </div>

      <Modal open={open} title="Registrar gasto" onClose={handleCloseModal}>
        <div className="stack-gap">
          <label>
            <span>Categoría</span>
            <select
              className="field"
              value={form.categoryId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  categoryId: Number(e.target.value)
                }))
              }
            >
              <option value={0}>Selecciona una categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Monto</span>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  amount: Number(e.target.value)
                }))
              }
            />
          </label>

          <label>
            <span>Descripción</span>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
            />
          </label>

          <label>
            <span>Fecha del gasto</span>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  expenseDate: e.target.value
                }))
              }
            />
          </label>

          <div className="form-actions">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar gasto'}
            </Button>
          </div>

          {formError && <p className="error-text">{formError}</p>}
          {createMutation.isError && (
            <p className="error-text">{(createMutation.error as Error).message}</p>
          )}
        </div>
      </Modal>
    </section>
  );
};