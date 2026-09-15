import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Sparkles, ShieldCheck, AlertTriangle, ListChecks, ArrowRight } from 'lucide-react';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { SeverityBadge, StatusPill } from '../components/Badges.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';
import client from '../api/client.js';

const SEVERITY_COLORS = { Low: '#2A7A6C', Medium: '#C98A3E', High: '#B4432F', Critical: '#93341F' };

export default function Audit() {
  const [priority, setPriority] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const endpoint = `/audit/summary?${new URLSearchParams({ ...(priority ? { priority } : {}), ...(actionStatus ? { action_status: actionStatus } : {}) }).toString()}`;
  const { data, loading, error, reload } = useApiData(endpoint);
  const severityData = data ? Object.entries(data.severityBreakdown).map(([severity, count]) => ({ severity, count })) : [];

  async function advanceAction(action) {
    const next = { pending: 'in_progress', in_progress: 'completed', completed: 'verified', verified: 'verified' }[action.status];
    if (next === action.status) return;
    await client.patch(`/audit/actions/${action.id}`, { status: next });
    reload();
  }

  return (
    <div>
      <Topbar title="Audit & Compliance" subtitle="Compliance scores, violation severity and corrective action tracking" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <KpiRow items={[
              { label: 'Compliance score', value: `${data.kpis.complianceScorePct}%` },
              { label: 'Open issues', value: data.kpis.openIssues },
              { label: 'Checklist score', value: `${data.kpis.checklistScorePct}%` },
              { label: 'Avg. closure time', value: `${data.kpis.avgClosureDays}d` },
            ]} />

            <Panel title="Corrective-action queue">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-[12px] text-muted">Priority<select value={priority} onChange={(e) => setPriority(e.target.value)} className="field mt-1"><option value="">All priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
                <label className="text-[12px] text-muted">Status<select value={actionStatus} onChange={(e) => setActionStatus(e.target.value)} className="field mt-1"><option value="">Pending &amp; active</option><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="verified">Verified</option></select></label>
                <span className="text-[12px] text-muted pb-2">{data.pendingActions?.length || 0} matching pending/actionable item{(data.pendingActions?.length || 0) === 1 ? '' : 's'}</span>
              </div>
              <div className="overflow-x-auto mt-4 -mx-5 px-5"><table className="data-table"><thead><tr><th>Outlet</th><th>Category</th><th>Priority</th><th>Owner</th><th>Due date</th><th>Status</th><th>Action</th></tr></thead><tbody>
                {(data.pendingActions || []).map((a) => <tr key={a.id}><td className="font-medium">{a.outlet}</td><td>{a.category}</td><td><SeverityBadge level={a.severity} /></td><td>{a.owner}</td><td className="num">{a.dueDate}</td><td><StatusPill status={a.status} /></td><td><button onClick={() => advanceAction(a)} className="text-[12px] text-teal-700 underline underline-offset-2">{a.status === 'pending' ? 'Start' : a.status === 'in_progress' ? 'Complete' : 'Verify'}</button></td></tr>)}
                {(!data.pendingActions || data.pendingActions.length === 0) && <tr><td colSpan={7} className="text-muted py-5 text-center">No matching corrective actions.</td></tr>}
              </tbody></table></div>
            </Panel>

            {(() => {
              const critical = data.severityBreakdown?.Critical || 0;
              const weakest = data.complianceByOutlet?.[0];
              const overdue = data.overdueActions?.length || 0;
              return (
                <Panel>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-sm bg-red-50 text-red-700 flex items-center justify-center shrink-0"><Sparkles size={18} /></div>
                      <div>
                        <div className="flex items-center gap-2"><h2 className="panel-title">FranchiseOps AI · Audit Agent</h2><span className="pill bg-red-50 text-red-700 border-red-100">Rule engine active</span></div>
                        <p className="text-[13px] text-muted mt-1">A digital quality inspector that prioritizes risk, explains findings and routes corrective actions.</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted lg:text-right">Inputs: audits, violations, inventory and feedback<br /><span className="text-red-700 font-medium">Critical findings are prioritized</span></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 mt-5">
                    <div className="bg-canvas border border-line p-4"><div className="flex items-center gap-2 text-red-700 text-[12px] font-medium"><AlertTriangle size={14} /> Risk priority</div><p className="text-[13px] text-ink2 mt-2 leading-relaxed">{critical ? <><strong>{critical} critical finding{critical === 1 ? '' : 's'}</strong> detected. Escalate immediately and require verification evidence before closure.</> : 'No critical findings are currently detected by the severity rules.'}</p></div>
                    <div className="bg-canvas border border-line p-4"><div className="flex items-center gap-2 text-amber-700 text-[12px] font-medium"><ShieldCheck size={14} /> Outlet signal</div><p className="text-[13px] text-ink2 mt-2 leading-relaxed">{weakest ? <><strong>{weakest.code}</strong> is the lowest-scoring outlet at <strong>{Math.round(weakest.avg_score)}/100</strong>. Schedule a focused follow-up audit.</> : 'Outlet compliance signals are not available yet.'}</p></div>
                    <div className="bg-canvas border border-line p-4"><div className="flex items-center gap-2 text-teal-700 text-[12px] font-medium"><ListChecks size={14} /> Action workflow</div><p className="text-[13px] text-ink2 mt-2 leading-relaxed">{overdue ? <><strong>{overdue} overdue action{overdue === 1 ? '' : 's'}</strong> require an owner, deadline and evidence review. Track Pending → In Progress → Verified.</> : 'No overdue corrective actions require escalation.'}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line text-[11px] text-muted"><span className="pill">Rule validation</span><span className="pill">Policy checker</span><span className="pill">Severity classification</span><span className="pill">Trend detection</span><span className="pill">Report generator</span><span className="ml-auto inline-flex items-center gap-1 text-teal-700"><ArrowRight size={13} /> Store → validate → assign → verify</span></div>
                </Panel>
              );
            })()}

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="Violations by severity">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={severityData}>
                    <CartesianGrid vertical={false} stroke="#E3DFD3" />
                    <XAxis dataKey="severity" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {severityData.map((d) => <Cell key={d.severity} fill={SEVERITY_COLORS[d.severity]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Compliance score by outlet — lowest first">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.complianceByOutlet} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke="#E3DFD3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: '#1A1F2B' }} width={70} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="avg_score" fill="#1F6F63" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <Panel title="Overdue corrective actions">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="data-table">
                  <thead><tr><th>Outlet</th><th>Category</th><th>Severity</th><th>Owner</th><th>Due date</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.overdueActions.length === 0 && <tr><td colSpan={6} className="text-muted py-6 text-center">No overdue corrective actions.</td></tr>}
                    {data.overdueActions.map((a) => (
                      <tr key={a.id}>
                        <td className="font-medium">{a.outlet}</td>
                        <td>{a.category}</td>
                        <td><SeverityBadge level={a.severity} /></td>
                        <td>{a.owner}</td>
                        <td className="num">{a.dueDate}</td>
                        <td><StatusPill status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="Recent audits">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="data-table">
                    <thead><tr><th>Outlet</th><th>Date</th><th>Auditor</th><th>Score</th></tr></thead>
                    <tbody>
                      {data.recentAudits.map((a) => (
                        <tr key={a.id}>
                          <td className="font-medium">{a.outlet}</td>
                          <td className="num">{a.date}</td>
                          <td>{a.auditor}</td>
                          <td className="num font-medium">{a.score}/100</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Recent violations">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="data-table">
                    <thead><tr><th>Outlet</th><th>Category</th><th>Severity</th><th>Status</th></tr></thead>
                    <tbody>
                      {data.recentViolations.map((v) => (
                        <tr key={v.id}>
                          <td className="font-medium">{v.outlet}</td>
                          <td>{v.category}</td>
                          <td><SeverityBadge level={v.severity} /></td>
                          <td><StatusPill status={v.status} /></td>
                        </tr>
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
