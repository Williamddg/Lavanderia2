import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@renderer/services/api';
import { DataTable, Input, PageHeader, SummaryCard, Button } from '@renderer/ui/components';
import { currency } from '@renderer/utils/format';

export const ReportsPage = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', appliedFrom, appliedTo],
    queryFn: () => api.reportsSummary(appliedFrom, appliedTo)
  });

  return (
    <section className="stack-gap">
      <PageHeader
        title="Reportes"
        subtitle="Resumen financiero y operativo por rango de fechas."
      />

      <div className="card-panel stack-gap">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ minWidth: 180 }}>
            <span>Desde</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>

          <label style={{ minWidth: 180 }}>
            <span>Hasta</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          <Button
            onClick={() => {
              setAppliedFrom(from);
              setAppliedTo(to);
            }}
          >
            Aplicar filtro
          </Button>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard title="Ventas" value={currency(data?.totalSales ?? 0)} accent="#5fae88" />
        <SummaryCard title="Gastos" value={currency(data?.totalExpenses ?? 0)} accent="#c97373" />
        <SummaryCard title="Utilidad estimada" value={currency(data?.netUtility ?? 0)} accent="#5a7cff" />
        <SummaryCard title="Pagos registrados" value={currency(data?.totalPayments ?? 0)} accent="#d89d4f" />
      </div>

      <div className="summary-grid">
        <SummaryCard title="Órdenes" value={String(data?.totalOrders ?? 0)} accent="#6786a8" />
        <SummaryCard
          title="Métodos de pago usados"
          value={String(data?.paymentMethods.length ?? 0)}
          accent="#7a8a94"
        />
        <SummaryCard
          title="Estados de órdenes"
          value={String(data?.orderStatuses.length ?? 0)}
          accent="#a67c52"
        />
        <SummaryCard
          title="Rango"
          value={`${data?.from ?? '—'} a ${data?.to ?? '—'}`}
          accent="#63b08c"
        />
      </div>

      <div className="split-grid">
        <div className="card-panel">
          <h3>Pagos por método</h3>
          <DataTable
            rows={data?.paymentMethods ?? []}
            columns={[
              { key: 'method', header: 'Método', render: (row) => row.methodName },
              { key: 'count', header: 'Cantidad', render: (row) => row.count },
              { key: 'amount', header: 'Monto', render: (row) => currency(row.amount) }
            ]}
          />
        </div>

        <div className="card-panel">
          <h3>Órdenes por estado</h3>
          <DataTable
            rows={data?.orderStatuses ?? []}
            columns={[
              { key: 'status', header: 'Estado', render: (row) => row.statusName },
              { key: 'count', header: 'Cantidad', render: (row) => row.count },
              { key: 'total', header: 'Total', render: (row) => currency(row.total) }
            ]}
          />
        </div>
      </div>

      {isLoading && <div className="card-panel">Cargando reportes...</div>}
    </section>
  );
};