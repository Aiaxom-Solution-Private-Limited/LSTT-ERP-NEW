import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  TrendingUp,
  Award,
  DollarSign,
  Building2
} from 'lucide-react';

export const SalesReportsView: React.FC = () => {
  const { employees, confirmedTours } = useDmc();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP-101');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('this_quarter');
  const [searchQuery, setSearchQuery] = useState('');

  const salesStaff = employees.filter(
    e => e.department === 'sales' || e.roleTitle.includes('Director') || e.department === 'executive'
  );

  const activeStaff = employees.find(e => e.id === selectedEmpId) || employees[0];

  const staffTours = confirmedTours.filter(tour => {
    const matchesStaff = selectedEmpId === 'all' ? true : tour.assignedSalesperson === activeStaff.name;
    const matchesDest =
      selectedDestination === 'all'
        ? true
        : tour.destination.toLowerCase().includes(selectedDestination.toLowerCase());
    const matchesSearch =
      tour.tourCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStaff && matchesDest && matchesSearch;
  });

  const totalRevenue = staffTours.reduce((acc, t) => acc + t.sellingPrice, 0);
  const totalCost = staffTours.reduce((acc, t) => acc + t.totalEstimatedCost, 0);
  const totalGrossProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const totalPax = staffTours.reduce((acc, t) => acc + t.adults + t.children, 0);
  const incentiveCalculated = Math.round(totalGrossProfit * 0.05);

  const handleExportCsv = () => {
    const headers = [
      'Tour Code', 'Client Name', 'Salesperson', 'Employee ID', 'Destination',
      'Start Date', 'End Date', 'Pax', 'Selling Price (INR)', 'Estimated Cost (INR)',
      'Gross Profit (INR)', 'Margin %', 'Status'
    ];

    const rows = staffTours.map(t => {
      const profit = t.sellingPrice - t.totalEstimatedCost;
      const margin = t.sellingPrice > 0 ? ((profit / t.sellingPrice) * 100).toFixed(1) : '0';
      return [
        `"${t.tourCode}"`, `"${t.clientName}"`, `"${t.assignedSalesperson}"`,
        `"${selectedEmpId === 'all' ? 'ALL' : activeStaff.id}"`, `"${t.destination}"`,
        `"${t.startDate}"`, `"${t.endDate}"`, `"${t.adults + t.children}"`,
        `"${t.sellingPrice}"`, `"${t.totalEstimatedCost}"`, `"${profit}"`,
        `"${margin}%"`, `"${t.status}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LetsSeeTravels_Sales_Report_${selectedEmpId === 'all' ? 'All' : activeStaff.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const tableHtml = `
      <table border="1">
        <thead>
          <tr style="background-color: #047857; color: white;">
            <th>Tour Code</th><th>Client Name</th><th>Salesperson</th><th>Employee ID</th>
            <th>Destination</th><th>Start Date</th><th>Pax</th><th>Selling Price (INR)</th>
            <th>Gross Margin</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${staffTours.map(t => `
            <tr>
              <td>${t.tourCode}</td><td>${t.clientName}</td><td>${t.assignedSalesperson}</td>
              <td>${selectedEmpId === 'all' ? 'ALL' : activeStaff.id}</td><td>${t.destination}</td>
              <td>${t.startDate}</td><td>${t.adults + t.children}</td><td>${t.sellingPrice}</td>
              <td>${t.sellingPrice - t.totalEstimatedCost}</td><td>${t.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SalesReport_${selectedEmpId === 'all' ? 'All' : activeStaff.id}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Performance & Incentive MIS · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Employee ID-Wise Sales Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Filter revenue, margins, and incentives by Employee ID and export CSV or Excel reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Pure Filter Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className="block text-slate-700 font-semibold text-xs mb-1.5">
            Staff Member / Employee ID
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Sales Executives (Consolidated)</option>
            {salesStaff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id} · {s.loginId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold text-xs mb-1.5">
            Destination Sector
          </label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Northeast Sectors</option>
            <option value="Meghalaya">Meghalaya (Shillong / Cherrapunji)</option>
            <option value="Kaziranga">Kaziranga & Assam</option>
            <option value="Arunachal">Arunachal Pradesh (Tawang)</option>
            <option value="Sikkim">Sikkim & Darjeeling</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold text-xs mb-1.5">
            Fiscal Period
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="this_month">Current Month (November 2026)</option>
            <option value="this_quarter">Q3 FY 2026-27</option>
            <option value="fy2026">Full Year FY 2026-27</option>
          </select>
        </div>
      </div>

      {/* Pure Staff Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-base shrink-0">
            {selectedEmpId === 'all' ? 'A' : activeStaff.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-slate-900 text-base">
                {selectedEmpId === 'all' ? 'All Sales Executives' : activeStaff.name}
              </span>
              {selectedEmpId !== 'all' && (
                <span className="font-mono text-xs font-semibold text-emerald-700">
                  {activeStaff.id}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedEmpId === 'all'
                ? 'Consolidated sales pipeline across Guwahati HQ'
                : `${activeStaff.loginId} · ${activeStaff.email} · ${activeStaff.roleTitle}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 text-xs tabular-nums">
          <div>
            <span className="text-slate-500 block">Tours Confirmed</span>
            <span className="text-lg font-bold text-slate-900">{staffTours.length}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Pax</span>
            <span className="text-lg font-bold text-slate-900">{totalPax}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Est. Incentive (5%)</span>
            <span className="text-lg font-bold text-emerald-700">
              ₹{incentiveCalculated.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Pure KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Gross Booking Value</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Confirmed client invoices</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Net Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-3 tabular-nums">
            ₹{totalGrossProfit.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Selling less direct costs</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Average Margin</span>
            <Award className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
            {avgMargin.toFixed(1)}%
          </div>
          <p className="text-xs text-emerald-700 font-medium mt-1">Target 18%+</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Avg Ticket Size</span>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
            ₹{staffTours.length > 0 ? Math.round(totalRevenue / staffTours.length).toLocaleString('en-IN') : '0'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Per confirmed package</p>
        </div>
      </div>

      {/* Pure White Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 text-base">
            Attributed Confirmed Tours ({staffTours.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tour code or client..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3.5 px-6">Tour Code</th>
                <th className="py-3.5 px-6">Client</th>
                <th className="py-3.5 px-6">Destination & Dates</th>
                <th className="py-3.5 px-6">Pax</th>
                <th className="py-3.5 px-6">Revenue</th>
                <th className="py-3.5 px-6">Est. Cost</th>
                <th className="py-3.5 px-6">Profit & Margin</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {staffTours.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No confirmed tours found for this filter combination.
                  </td>
                </tr>
              ) : (
                staffTours.map(t => {
                  const profit = t.sellingPrice - t.totalEstimatedCost;
                  const margin = t.sellingPrice > 0 ? (profit / t.sellingPrice) * 100 : 0;

                  return (
                    <tr key={t.tourCode} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-emerald-700">
                        {t.tourCode}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{t.clientName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{t.assignedSalesperson}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-900">{t.destination}</div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">{t.startDate} to {t.endDate}</div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900 tabular-nums">
                        {t.adults}A + {t.children}C
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900 tabular-nums">
                        ₹{t.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-slate-600 tabular-nums">
                        ₹{t.totalEstimatedCost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 tabular-nums">
                        <div className="font-semibold text-emerald-800">
                          ₹{profit.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {margin.toFixed(1)}% margin
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold capitalize text-emerald-700">
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
