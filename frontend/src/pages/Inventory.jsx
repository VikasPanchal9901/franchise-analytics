import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';

const ABC_COLORS = { A: '#1F6F63', B: '#C98A3E', C: '#B4432F' };

export default function Inventory() {
  const [outletId, setOutletId] = useState('');
  const { data: outletsData } = useApiData('/outlets');
  const endpoint = outletId ? `/inventory/summary?outlet_id=${outletId}` : '/inventory/summary';
  const { data, loading, error, reload } = useApiData(endpoint, [outletId]);

  const agingData = data ? Object.entries(data.agingBuckets).map(([bucket, count]) => ({ bucket, count })) : [];

  return (
    <div>
      <Topbar title="Inventory" subtitle="Stock cover, reorder alerts, ABC analysis and wastage across outlets" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        <div className="flex justify-end">
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
              { label: 'Units on hand', value: data.kpis.totalUnits.toLocaleString('en-IN') },
              { label: 'Avg. stock cover', value: `${data.kpis.stockCoverDays} days` },
              { label: 'Stockout rate', value: `${data.kpis.stockoutRatePct}%` },
              { label: '30-day wastage', value: `${data.kpis.wastagePct}%` },
            ]} />

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="ABC analysis — revenue contribution by product">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.abc} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke="#E3DFD3" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#1A1F2B' }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v, n, p) => [`₹${v.toLocaleString('en-IN')}`, `Class ${p.payload.class}`]} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="revenue" radius={[0, 2, 2, 0]}>
                      {data.abc.map((d, i) => <Cell key={i} fill={ABC_COLORS[d.class]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 text-[12px] text-muted">
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: ABC_COLORS.A }} />Class A — top 70% of revenue</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: ABC_COLORS.B }} />Class B</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: ABC_COLORS.C }} />Class C</span>
                </div>
              </Panel>

              <Panel title="Stock aging — days since last restock">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={agingData}>
                    <CartesianGrid vertical={false} stroke="#E3DFD3" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="count" fill="#2A7A6C" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <Panel title="Reorder alerts — lowest days of cover first">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="data-table">
                  <thead><tr><th>Outlet</th><th>Product</th><th>On hand</th><th>Reorder level</th><th>Days of cover</th></tr></thead>
                  <tbody>
                    {data.reorderAlerts.length === 0 && <tr><td colSpan={5} className="text-muted py-6 text-center">No outlets below reorder level right now.</td></tr>}
                    {data.reorderAlerts.map((r, i) => (
                      <tr key={i}>
                        <td className="font-medium">{r.outlet} <span className="text-muted font-normal">({r.outletCode})</span></td>
                        <td>{r.product}</td>
                        <td className="num">{r.stockOnHand}</td>
                        <td className="num text-muted">{r.reorderLevel}</td>
                        <td className={`num font-medium ${r.daysOfCover <= 1 ? 'text-critical-600' : 'text-ochre-600'}`}>{r.daysOfCover}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {!outletId && (
              <Panel title="Outlet-wise stock cover">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="data-table">
                    <thead><tr><th>Outlet</th><th>Units on hand</th><th>Avg. days of cover</th></tr></thead>
                    <tbody>
                      {data.outletWise.map((o) => (
                        <tr key={o.id}>
                          <td className="font-medium">{o.name} <span className="text-muted font-normal">({o.code})</span></td>
                          <td className="num">{o.units}</td>
                          <td className="num">{o.avg_cover ?? '—'}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
