import React, { useMemo, useState } from 'react';
import { get, inr, pctText } from '../api';
import { BarChart, HBars } from '../charts';
import { emptyFilters, FilterBar, toQuery, type FinanceFilters } from '../FilterBar';
import { Card, ErrorBox, Kpi, Loading, Money, PageHeader, Table, Td, Th, useLoad } from '../ui';

export const FinanceOverviewView: React.FC<{ onOpenTour: (code: string) => void }> = ({ onOpenTour }) => {
  const [filters, setFilters] = useState<FinanceFilters>(emptyFilters());
  const q = toQuery(filters);
  const { data, error, loading } = useLoad(() => get(`/finance/overview${q}`), [q]);
  const tours = useLoad(() => get<any[]>('/tours'), []);
  const people = useMemo(() => ({
    sales: [...new Set((tours.data ?? []).map((t) => t.salesperson_name).filter(Boolean))] as string[],
    ops: [...new Set((tours.data ?? []).map((t) => t.operations_lead_name).filter(Boolean))] as string[],
  }), [tours.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Overview" subtitle="Company-wide tour financial position, calculated by the server from bookings, bills, payments and receipts." />
      <FilterBar value={filters} onChange={setFilters} people={people} />
      {error && <ErrorBox error={error} />}
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi label="Tours" value={String(data.tourCount)} hint={`${data.lossMakingTours.length} loss-making (forecast)`} />
            <Kpi label="Tour revenue (recognised)" value={inr(data.totals.revenue)} hint="Excl. GST" />
            <Kpi label="Invoiced to clients" value={inr(data.totals.invoiced)} hint="Tax invoices, incl. GST" />
            <Kpi label="Collected from clients" value={inr(data.totals.collected)} hint="Verified receipts" />
            <Kpi label="Client outstanding" value={inr(data.totals.clientOutstanding)} tone={Number(data.totals.clientOutstanding) > 0 ? 'bad' : 'default'} />
            <Kpi label="Estimated cost" value={inr(data.totals.estimatedCost)} hint="Planned, all lines" />
            <Kpi label="Actual cost" value={inr(data.totals.actualCost)} hint={`Verified: ${inr(data.totals.verifiedCost)}`} />
            <Kpi label="Supplier bills" value={inr(data.totals.supplierBills)} />
            <Kpi label="Supplier payments" value={inr(data.totals.supplierPayments)} />
            <Kpi label="Supplier outstanding" value={inr(data.totals.supplierOutstanding)} tone={Number(data.totals.supplierOutstanding) > 0 ? 'bad' : 'default'} hint={Number(data.totals.supplierOutstanding) < 0 ? 'Negative: advances paid ahead of approved bills' : 'Approved bills − payments'} />
            <Kpi label="Gross profit (actual cost)" value={inr(data.totals.grossProfit)} tone={Number(data.totals.grossProfit) < 0 ? 'bad' : 'good'} hint="Revenue − actual cost" />
            <Kpi label="Net profit" value={inr(data.totals.netProfit)} hint="No overhead allocation configured" />
            <Kpi label="Average profit per tour" value={inr(data.totals.averageProfitPerTour)} />
            <Kpi label="Average margin" value={pctText(data.totals.averageMarginPct)} />
            <Kpi label="Needs attention" value={`${data.pendingReconciliation.length} / ${data.incompleteExpenses.length}`} hint="Pending reconciliation / incomplete expenses" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Revenue vs actual cost by month">
              <BarChart categories={data.charts.monthly.map((m: any) => m.month)} series={[
                { name: 'Revenue', values: data.charts.monthly.map((m: any) => m.revenue) },
                { name: 'Actual cost', values: data.charts.monthly.map((m: any) => m.cost) },
              ]} />
            </Card>
            <Card title="Monthly profit (revenue − actual cost)">
              <BarChart categories={data.charts.monthly.map((m: any) => m.month)} series={[{ name: 'Profit', values: data.charts.monthly.map((m: any) => m.profit) }]} />
            </Card>
            <Card title="Profit by tour (actual cost)">
              <BarChart categories={data.charts.byTour.map((t: any) => t.tourCode.replace('LST-', ''))} series={[{ name: 'Profit', values: data.charts.byTour.map((t: any) => t.profit) }]} />
            </Card>
            <Card title="Actual cost by expense category">
              <HBars rows={data.charts.expenseCategories.map((c: any) => ({ label: c.name, value: c.actual }))} />
            </Card>
            <Card title="Top suppliers by actual cost">
              <HBars rows={data.charts.suppliers.map((s: any) => ({ label: s.name, value: s.actual }))} />
            </Card>
            <Card title="Outstanding" pad={false}>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div>
                  <div className="px-4 pt-3 text-[11px] font-semibold text-slate-500">From clients</div>
                  <Table isEmpty={!data.charts.clientOutstanding.length} empty="Nothing outstanding" head={<><Th>Tour</Th><Th right>Amount</Th></>}>
                    {data.charts.clientOutstanding.map((r: any) => (
                      <tr key={r.tourCode}><Td><button className="font-mono text-emerald-700 hover:underline" onClick={() => onOpenTour(r.tourCode)}>{r.tourCode}</button><div className="text-slate-500 truncate max-w-[140px]">{r.client}</div></Td><Td right><Money v={r.outstanding} /></Td></tr>
                    ))}
                  </Table>
                </div>
                <div>
                  <div className="px-4 pt-3 text-[11px] font-semibold text-slate-500">To suppliers</div>
                  <Table isEmpty={!data.charts.supplierOutstanding.length} empty="Nothing outstanding" head={<><Th>Tour</Th><Th right>Amount</Th></>}>
                    {data.charts.supplierOutstanding.map((r: any) => (
                      <tr key={r.tourCode}><Td><button className="font-mono text-emerald-700 hover:underline" onClick={() => onOpenTour(r.tourCode)}>{r.tourCode}</button></Td><Td right><Money v={r.outstanding} /></Td></tr>
                    ))}
                  </Table>
                </div>
              </div>
            </Card>
          </div>

          {(data.lossMakingTours.length > 0 || data.pendingReconciliation.length > 0 || data.incompleteExpenses.length > 0) && (
            <Card title="Tours needing attention">
              <div className="grid md:grid-cols-3 gap-4 text-xs">
                {[['Loss-making (forecast)', data.lossMakingTours], ['Pending reconciliation', data.pendingReconciliation], ['Unrecorded / incomplete expenses', data.incompleteExpenses]].map(([title, list]: any) => (
                  <div key={title}>
                    <div className="font-semibold text-slate-600 mb-1.5">{title} ({list.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.length ? list.map((c: string) => <button key={c} onClick={() => onOpenTour(c)} className="font-mono px-2 py-0.5 rounded border border-slate-200 text-emerald-700 hover:bg-emerald-50">{c}</button>) : <span className="text-slate-400">None</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
