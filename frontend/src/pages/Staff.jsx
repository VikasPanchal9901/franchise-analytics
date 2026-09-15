import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { StatusPill } from '../components/Badges.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';

export default function Staff() {
  const [outletId, setOutletId] = useState('');
  const { data: outletsData } = useApiData('/outlets');
  const endpoint = outletId ? `/staff/summary?outlet_id=${outletId}` : '/staff/summary';
  const { data, loading, error, reload } = useApiData(endpoint, [outletId]);

  const roleData = data ? Object.entries(data.roleDistribution).map(([role, count]) => ({ role, count })) : [];

  return (
    <div>
      <Topbar title="Staff & Workforce" subtitle="Attendance, productivity, shift coverage and turnover across outlets" />
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
              { label: 'Headcount', value: data.kpis.headcount },
              { label: 'Avg. attendance', value: `${data.kpis.avgAttendance}%` },
              { label: 'Avg. productivity', value: `${data.kpis.avgProductivity}%` },
              { label: 'Avg. overtime / mo', value: `${data.kpis.avgOvertime}h` },
              { label: 'Turnover', value: `${data.kpis.turnoverPct}%` },
            ]} />

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="Shift coverage">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.shiftCoverage}>
                    <CartesianGrid vertical={false} stroke="#E3DFD3" />
                    <XAxis dataKey="shift" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="headcount" fill="#1F6F63" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Role distribution">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={roleData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke="#E3DFD3" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="role" tick={{ fontSize: 11, fill: '#1A1F2B' }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="count" fill="#C98A3E" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {!outletId && (
              <Panel title="Productivity by outlet">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="data-table">
                    <thead><tr><th>Outlet</th><th>Headcount</th><th>Avg. productivity</th><th>Avg. attendance</th></tr></thead>
                    <tbody>
                      {data.productivityByOutlet.map((o) => (
                        <tr key={o.code}>
                          <td className="font-medium">{o.name} <span className="text-muted font-normal">({o.code})</span></td>
                          <td className="num">{o.headcount}</td>
                          <td className="num">{o.avg_productivity}%</td>
                          <td className="num">{o.avg_attendance}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            <Panel title="Top performers by productivity">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Role</th><th>Outlet</th><th>Shift</th><th>Attendance</th><th>Productivity</th><th>Overtime</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.roster.map((s, i) => (
                      <tr key={i}>
                        <td className="font-medium">{s.name}</td>
                        <td>{s.role}</td>
                        <td>{s.outlet} <span className="text-muted">({s.outletCode})</span></td>
                        <td>{s.shift}</td>
                        <td className="num">{s.attendancePct}%</td>
                        <td className="num">{s.productivityPct}%</td>
                        <td className="num">{s.overtimeHours}h</td>
                        <td><StatusPill status={s.status} /></td>
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
