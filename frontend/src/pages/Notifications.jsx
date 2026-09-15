import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { SeverityBadge, StatusPill } from '../components/Badges.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { useSocketEvent } from '../context/SocketContext.jsx';
import client from '../api/client.js';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { data, loading, error, refresh, reload } = useApiData('/notifications/summary');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  useSocketEvent('notification:new', () => refresh());
  useSocketEvent('notification:updated', () => refresh());

  async function act(id, action) {
    setBusyId(id);
    try {
      await client.post(`/notifications/${id}/${action}`);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  const byPriorityData = data ? Object.entries(data.byPriority).map(([priority, count]) => ({ priority, count })) : [];
  const byChannelData = data ? Object.entries(data.byChannel).map(([channel, count]) => ({ channel, count })) : [];
  const feed = data ? data.feed.filter((n) => priorityFilter === 'all' || n.priority === priorityFilter) : [];

  return (
    <div>
      <Topbar title="Notifications & Alerts" subtitle="Live event feed with escalation and resolution tracking" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <KpiRow items={[
              { label: 'Notifications sent', value: data.kpis.notificationsSent },
              { label: 'Acknowledgement rate', value: `${data.kpis.acknowledgementRatePct}%` },
              { label: 'Open actions', value: data.kpis.openActions },
              { label: 'SLA breaches', value: data.kpis.slaBreaches },
              { label: 'Avg. resolution time', value: `${data.kpis.avgResolutionHrs}h` },
            ]} />

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="By priority">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byPriorityData}>
                    <CartesianGrid vertical={false} stroke="#E3DFD3" />
                    <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} className="capitalize" />
                    <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="count" fill="#B4432F" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="By channel">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byChannelData}>
                    <CartesianGrid vertical={false} stroke="#E3DFD3" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="count" fill="#1F6F63" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <Panel
              title="Live feed"
              action={
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-[12.5px] border border-line rounded-sm px-2 py-1 bg-white">
                  <option value="all">All priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              }
            >
              <ul className="divide-y divide-line -mx-5">
                {feed.map((n) => (
                  <li key={n.id} className="px-5 py-3.5 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge level={n.priority} />
                        <span className="text-[13.5px] font-medium text-ink2">{n.title}</span>
                        <StatusPill status={n.status} />
                      </div>
                      <p className="text-[13px] text-muted">{n.message}</p>
                      <p className="text-[11.5px] text-muted mt-1">
                        {n.outlet ? `${n.outlet} (${n.outletCode}) · ` : ''}{n.channel} · {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {n.status === 'sent' || n.status === 'escalated' ? (
                        <button
                          disabled={busyId === n.id}
                          onClick={() => act(n.id, 'acknowledge')}
                          className="text-[12px] px-2.5 py-1.5 border border-line rounded-sm hover:bg-canvas disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      ) : null}
                      {n.status !== 'resolved' && (
                        <button
                          disabled={busyId === n.id}
                          onClick={() => act(n.id, 'resolve')}
                          className="text-[12px] px-2.5 py-1.5 bg-teal-600 text-white rounded-sm hover:bg-teal-700 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {feed.length === 0 && <li className="py-10 text-center text-muted text-[13px]">No notifications match this filter.</li>}
              </ul>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
