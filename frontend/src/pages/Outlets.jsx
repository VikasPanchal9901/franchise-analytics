import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { StatusPill } from '../components/Badges.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { useSocketEvent } from '../context/SocketContext.jsx';

function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function Outlets() {
  const { data, loading, error, refresh, reload } = useApiData('/outlets/summary');
  const [sortBy, setSortBy] = useState('monthlySales');
  useSocketEvent('sale:new', () => refresh());

  const ranking = data ? [...data.ranking].sort((a, b) => b[sortBy] - a[sortBy]) : [];

  return (
    <div>
      <Topbar title="Outlet Performance" subtitle="Network ranking, sales trend and target achievement by outlet" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <KpiRow items={[
              { label: 'Total monthly sales', value: formatINR(data.kpis.totalMonthlySales), delta: data.kpis.salesGrowthPct, deltaGood: data.kpis.salesGrowthPct >= 0 },
              { label: 'Avg. gross margin', value: `${data.kpis.avgGrossMarginPct}%` },
              { label: 'Avg. customer rating', value: `${data.kpis.avgCustomerRating} / 5` },
              { label: 'Avg. target achievement', value: `${data.kpis.avgTargetAchievementPct}%` },
            ]} />

            <Panel title="Network sales — last 30 days">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.trend}>
                  <CartesianGrid vertical={false} stroke="#E3DFD3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5B6472' }} tickFormatter={(d) => d.slice(5)} minTickGap={24} axisLine={{ stroke: '#E3DFD3' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} width={55} />
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#1F6F63" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel
              title="Outlet ranking"
              action={
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-[12.5px] border border-line rounded-sm px-2 py-1 bg-white">
                  <option value="monthlySales">Sort: Sales</option>
                  <option value="targetAchievementPct">Sort: Target achievement</option>
                  <option value="grossMarginPct">Sort: Margin</option>
                  <option value="rating">Sort: Rating</option>
                </select>
              }
            >
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Outlet</th><th>City</th><th>Manager</th><th>Status</th>
                      <th>Monthly sales</th><th>Growth</th><th>AOV</th><th>Margin</th><th>Rating</th><th>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((o, i) => (
                      <tr key={o.id}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="font-medium">{o.name} <span className="text-muted font-normal">({o.code})</span></td>
                        <td>{o.city}</td>
                        <td>{o.manager}</td>
                        <td><StatusPill status={o.status} /></td>
                        <td className="num">{formatINR(o.monthlySales)}</td>
                        <td className={`num ${o.salesGrowthPct >= 0 ? 'text-success-600' : 'text-critical-600'}`}>{o.salesGrowthPct > 0 ? '+' : ''}{o.salesGrowthPct}%</td>
                        <td className="num">₹{o.avgOrderValue}</td>
                        <td className="num">{o.grossMarginPct}%</td>
                        <td className="num">{o.rating}</td>
                        <td className="num">{o.targetAchievementPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
