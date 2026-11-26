import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { download, fmtDate, get, pctText } from '../api';
import { emptyFilters, FilterBar, toQuery, type FinanceFilters } from '../FilterBar';
import { Btn, Card, ErrorBox, Loading, Money, PageHeader, StatusBadge, Table, Td, Th, useLoad } from '../ui';

export const TourPnlListView: React.FC<{ onOpenTour: (code: string) => void }> = ({ onOpenTour }) => {
  const [filters, setFilters] = useState<FinanceFilters>(emptyFilters());
  const q = toQuery(filters);
  const { data, error, loading } = useLoad(() => get<any[]>(`/finance/tours${q}`), [q]);
  const all = useLoad(() => get<any[]>('/tours'), []);
  const people = useMemo(() => ({
    sales: [...new Set((all.data ?? []).map((t) => t.salesperson_name).filter(Boolean))] as string[],
    ops: [...new Set((all.data ?? []).map((t) => t.operations_lead_name).filter(Boolean))] as string[],
  }), [all.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tour-wise P&L" subtitle="Every Tour Code with revenue, cost and profit. Open a tour to see the bills and transactions behind each figure.">
        <Btn onClick={() => download(`/finance/reports/tour-pnl${q ? q + '&' : '?'}format=csv`, 'tour-pnl.csv')}><Download className="w-3.5 h-3.5" /> Export (Excel CSV)</Btn>
      </PageHeader>
      <FilterBar value={filters} onChange={setFilters} people={people} />
      {error && <ErrorBox error={error} />}
      <Card pad={false} title={data ? `${data.length} tours` : 'Tours'} right={<span className="text-[11px] text-slate-400">Profit uses actual cost; margin = profit ÷ recognised revenue</span>}>
        {loading && !data ? <Loading /> : (
          <Table isEmpty={!data?.length} empty="No tours match these filters" head={<>
            <Th>Tour Code</Th><Th>Client · Destination</Th><Th>Dates</Th><Th right>Revenue</Th><Th right>Collected</Th><Th right>Est. cost</Th>
            <Th right>Actual cost</Th><Th right>Gross profit</Th><Th right>Margin</Th><Th right>Supplier o/s</Th><Th>Financial status</Th><Th />
          </>}>
            {(data ?? []).map((t) => (
              <tr key={t.tour.tour_code} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => onOpenTour(t.tour.tour_code)}>
                <Td><span className="font-mono font-bold text-emerald-700">{t.tour.tour_code}</span></Td>
                <Td><div className="font-semibold text-slate-900 max-w-[200px] truncate" title={t.tour.client_name}>{t.tour.client_name}</div><div className="text-slate-500">{t.tour.destination}</div></Td>
                <Td className="whitespace-nowrap text-slate-600">{fmtDate(t.tour.start_date)}<br />{fmtDate(t.tour.end_date)}</Td>
                <Td right><Money v={t.revenue} strong /></Td>
                <Td right><Money v={t.collected} /></Td>
                <Td right><Money v={t.estimatedCost} /></Td>
                <Td right><Money v={t.actualCost} /></Td>
                <Td right><span className={Number(t.grossProfit) < 0 ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}><Money v={t.grossProfit} /></span></Td>
                <Td right className="tabular-nums">{pctText(t.marginPct)}</Td>
                <Td right><Money v={t.supplierOutstanding} /></Td>
                <Td><StatusBadge s={t.financialStatus} /></Td>
                <Td>{t.warningCount > 0 && <span className="inline-flex items-center gap-1 text-amber-800 font-semibold" title={`${t.warningCount} warnings`}><AlertTriangle className="w-3.5 h-3.5" />{t.warningCount}</span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};
