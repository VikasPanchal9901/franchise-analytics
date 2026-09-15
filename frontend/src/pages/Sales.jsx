import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { useSocketEvent } from '../context/SocketContext.jsx';

function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const CATEGORY_COLORS = ['#1F6F63', '#C98A3E', '#B4432F', '#2F7D5C', '#5B6472'];

export default function Sales() {
  const [outletId, setOutletId] = useState('');
  const [days, setDays] = useState(30);
  const { data: outletsData } = useApiData('/outlets');
  const endpoint = `/sales/summary?days=${days}${outletId ? `&outlet_id=${outletId}` : ''}`;
  const { data, loading, error, refresh, reload } = useApiData(endpoint, [outletId, days]);
  useSocketEvent('sale:new', () => refresh());

  return (
    <div>
      <Topbar title="Sales" subtitle="Revenue trend, category mix and product performance" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        <div className="flex justify-end gap-3">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="text-[12.5px] border border-line rounded-sm px-3 py-2 bg-white">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="text-[12.5px] border border-line rounded-sm px-3 py-2 bg-white">
            <option value="">All outlets</option>
            {outletsData?.outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <KpiRow items={[
              { label: 'Total revenue', value: formatINR(data.kpis.totalRevenue), delta: data.kpis.revenueGrowthPct, deltaGood: data.kpis.revenueGrowthPct >= 0 },
              { label: 'Units sold', value: data.kpis.totalUnits.toLocaleString('en-IN') },
              { label: 'Orders', value: data.kpis.totalOrders.toLocaleString('en-IN') },
              { label: 'Avg. order value', value: `₹${data.kpis.avgOrderValue}` },
              { label: 'Discounts given', value: formatINR(data.kpis.totalDiscountGiven) },
            ]} />

            <Panel title="Revenue trend">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F6F63" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1F6F63" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#E3DFD3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5B6472' }} tickFormatter={(d) => d.slice(5)} minTickGap={24} axisLine={{ stroke: '#E3DFD3' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} width={55} />
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#1F6F63" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="Revenue by category">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.byCategory} dataKey="revenue" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {data.byCategory.map((d, i) => <Cell key={d.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>

              {data.byOutlet.length > 0 ? (
                <Panel title="Revenue by outlet">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.byOutlet} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid horizontal={false} stroke="#E3DFD3" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                      <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: '#1A1F2B' }} width={70} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                      <Bar dataKey="revenue" fill="#2A7A6C" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
              ) : (
                <Panel title="Top products">
                  <div className="overflow-x-auto -mx-5 px-5">
                    <table className="data-table">
                      <thead><tr><th>Product</th><th>Category</th><th>Units</th><th>Revenue</th></tr></thead>
                      <tbody>
                        {data.topProducts.slice(0, 6).map((p, i) => (
                          <tr key={i}><td className="font-medium">{p.name}</td><td>{p.category}</td><td className="num">{p.units}</td><td className="num">{formatINR(p.revenue)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="Top performing products">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Category</th><th>Units</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {data.topProducts.map((p, i) => (
                        <tr key={i}><td className="font-medium">{p.name}</td><td>{p.category}</td><td className="num">{p.units}</td><td className="num">{formatINR(p.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Lowest performing products">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Category</th><th>Units</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {data.bottomProducts.map((p, i) => (
                        <tr key={i}><td className="font-medium">{p.name}</td><td>{p.category}</td><td className="num">{p.units}</td><td className="num">{formatINR(p.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
