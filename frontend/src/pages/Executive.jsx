import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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

export default function Executive() {
  const { data, loading, error, refresh, reload } = useApiData('/executive/summary');
  useSocketEvent('sale:new', () => refresh());
  useSocketEvent('notification:new', () => refresh());

  return (
    <div>
      <Topbar title="Executive Overview" subtitle="Franchise Intelligence Engine — network health, risks and recommended actions" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <KpiRow items={[
              { label: 'Network sales (30d)', value: formatINR(data.kpis.networkSales), delta: data.kpis.growthPct, deltaGood: data.kpis.growthPct >= 0 },
              { label: 'Avg. target achievement', value: `${data.kpis.avgTargetPct}%` },
              { label: 'At-risk outlets', value: data.kpis.atRiskOutlets },
              { label: 'Outlets tracked', value: data.franchises.length },
            ]} />

            <Panel title="Network sales — last 30 days">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.networkTrend}>
                  <defs>
                    <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F6F63" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1F6F63" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#E3DFD3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5B6472' }} tickFormatter={(d) => d.slice(5)} minTickGap={24} axisLine={{ stroke: '#E3DFD3' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} width={55} />
                  <Tooltip formatter={(v) => formatINR(v)} labelFormatter={(l) => `Date: ${l}`} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#1F6F63" strokeWidth={2} fill="url(#execGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Franchise health — lowest scoring first">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Outlet</th><th>City</th><th>Health score</th><th>Status</th>
                      <th>Sales</th><th>Ops</th><th>Audit</th><th>Customer</th><th>Finance</th><th>Inventory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.franchises.map((f) => (
                      <tr key={f.id}>
                        <td className="font-medium">{f.name}</td>
                        <td>{f.city}</td>
                        <td className="num font-medium">{f.healthScore}/100</td>
                        <td><StatusPill status={f.classification} /></td>
                        <td className="num text-muted">{f.components.sales}</td>
                        <td className="num text-muted">{f.components.operations}</td>
                        <td className="num text-muted">{f.components.audit}</td>
                        <td className="num text-muted">{f.components.customer}</td>
                        <td className="num text-muted">{f.components.finance}</td>
                        <td className="num text-muted">{f.components.inventory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid md:grid-cols-2 gap-6">
              {data.franchises.filter((f) => f.risks.length || f.opportunity).slice(0, 6).map((f) => (
                <Panel key={f.id} title={f.name} action={<StatusPill status={f.classification} />}>
                  {f.risks.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[11.5px] font-medium text-muted uppercase tracking-wide mb-2">Top risks</div>
                      <ul className="space-y-2">
                        {f.risks.slice(0, 2).map((r, i) => (
                          <li key={i} className="text-[13px] text-ink2 leading-relaxed">
                            <span className="font-medium">{r.type}</span> — {r.detail}
                            <span className="text-muted"> ({r.probabilityPct}% likelihood)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {f.opportunity && (
                    <div className="mb-3">
                      <div className="text-[11.5px] font-medium text-muted uppercase tracking-wide mb-2">Growth opportunity</div>
                      <p className="text-[13px] text-ink2 leading-relaxed">{f.opportunity.detail}</p>
                    </div>
                  )}
                  {f.recommendation && (
                    <div className="pt-3 border-t border-line">
                      <div className="text-[11.5px] font-medium text-muted uppercase tracking-wide mb-2">Recommendation · {f.recommendation.priority} priority</div>
                      <p className="text-[13px] text-ink2 leading-relaxed">{f.recommendation.action}</p>
                      <p className="text-[12px] text-muted mt-1">Owner: {f.recommendation.owner}</p>
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
