import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Sparkles, ArrowUpRight, Target, Users, TrendingUp } from 'lucide-react';
import Topbar from '../components/Topbar.jsx';
import Panel from '../components/Panel.jsx';
import KpiRow from '../components/KpiRow.jsx';
import { StatusPill } from '../components/Badges.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { useApiData } from '../hooks/useApiData.js';
import client from '../api/client.js';

function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function Marketing() {
  const { data, loading, error, reload } = useApiData('/marketing/summary');
  const [campaignForm, setCampaignForm] = useState({ name: '', channel: 'Instagram', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), budget: '' });
  const [formMessage, setFormMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function createCampaign(event) {
    event.preventDefault();
    setSaving(true); setFormMessage('');
    try {
      await client.post('/marketing/campaigns', campaignForm);
      setCampaignForm((current) => ({ ...current, name: '', budget: '' }));
      setFormMessage('Campaign created and added to the live comparison.');
      reload();
    } catch (err) { setFormMessage(err.response?.data?.error || 'Could not create campaign.'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <Topbar title="Marketing" subtitle="Campaign performance, funnel conversion and channel comparison" />
      <div className="p-8 space-y-6 max-w-[1400px]">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <>
            <KpiRow items={[
              { label: 'Campaign revenue', value: formatINR(data.kpis.campaignRevenue) },
              { label: 'ROAS', value: `${data.kpis.roas}x` },
              { label: 'Conversion rate', value: `${data.kpis.conversionRatePct}%` },
              { label: 'Cost per acquisition', value: `₹${data.kpis.cac}` },
              { label: 'CTR', value: `${data.kpis.ctrPct}%` },
            ]} />

            <Panel title="Campaign management">
              <form onSubmit={createCampaign} className="grid md:grid-cols-5 gap-3 items-end">
                <label className="text-[12px] text-muted">Campaign name<input required value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} className="field mt-1" placeholder="e.g. Weekend brunch push" /></label>
                <label className="text-[12px] text-muted">Channel<select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })} className="field mt-1"><option>Instagram</option><option>Google Ads</option><option>SMS</option><option>Email</option><option>In-store</option></select></label>
                <label className="text-[12px] text-muted">Budget (₹)<input required type="number" min="1" value={campaignForm.budget} onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })} className="field mt-1" placeholder="50000" /></label>
                <label className="text-[12px] text-muted">Start date<input required type="date" value={campaignForm.startDate} onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })} className="field mt-1" /></label>
                <label className="text-[12px] text-muted">End date<input required type="date" value={campaignForm.endDate} onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })} className="field mt-1" /></label>
                <button disabled={saving} className="bg-ink text-white px-4 py-2 rounded-sm text-[13px] hover:bg-ink-700 disabled:opacity-50 md:col-span-5 md:justify-self-end">{saving ? 'Saving…' : 'Add campaign'}</button>
              </form>
              {formMessage && <p className="text-[12px] text-teal-700 mt-3">{formMessage}</p>}
            </Panel>

            {(() => {
              const best = data.campaignComparison?.[0];
              const weakest = data.campaignComparison?.[data.campaignComparison.length - 1];
              const bestChannel = data.channelPerformance?.slice().sort((a, b) => b.roas - a.roas)[0];
              return (
                <Panel>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-sm bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Sparkles size={18} /></div>
                      <div>
                        <div className="flex items-center gap-2"><h2 className="panel-title">FranchiseOps AI · Marketing Agent</h2><span className="pill bg-teal-50 text-teal-700 border-teal-100">AI-assisted</span></div>
                        <p className="text-[13px] text-muted mt-1">Campaign intelligence that connects reach to revenue, conversion and customer response.</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted lg:text-right">Updated from campaign data<br /><span className="text-teal-700 font-medium">Recommendation engine ready</span></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 mt-5">
                    <div className="bg-canvas border border-line p-4"><div className="flex items-center gap-2 text-teal-700 text-[12px] font-medium"><TrendingUp size={14} /> Scale what works</div><p className="text-[13px] text-ink2 mt-2 leading-relaxed">{best ? <><strong>{best.name}</strong> leads with <strong>{best.roas}x ROAS</strong> and {best.conversions} conversions. Consider shifting incremental budget here.</> : 'The model needs campaign data to generate a recommendation.'}</p></div>
                    <div className="bg-canvas border border-line p-4"><div className="flex items-center gap-2 text-amber-700 text-[12px] font-medium"><Target size={14} /> Channel signal</div><p className="text-[13px] text-ink2 mt-2 leading-relaxed">{bestChannel ? <><strong>{bestChannel.channel}</strong> is currently the most efficient channel at <strong>{bestChannel.roas}x ROAS</strong>. Compare it against spend before reallocating.</> : 'No channel comparison is available yet.'}</p></div>
                    <div className="bg-canvas border border-line p-4"><div className="flex items-center gap-2 text-slate-700 text-[12px] font-medium"><Users size={14} /> Improve the weakest signal</div><p className="text-[13px] text-ink2 mt-2 leading-relaxed">{weakest ? <><strong>{weakest.name}</strong> is the lowest-ranked campaign. Review its audience, offer and conversion step before increasing reach.</> : 'No underperforming campaign detected.'}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line text-[11px] text-muted"><span className="pill">Customer segmentation</span><span className="pill">Campaign prediction</span><span className="pill">ROI recommendation</span><span className="pill">Sentiment-ready</span><span className="pill">Time-series trend</span><span className="ml-auto inline-flex items-center gap-1 text-teal-700"><ArrowUpRight size={13} /> Explainable recommendations</span></div>
                </Panel>
              );
            })()}

            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="Conversion funnel">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.funnel} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke="#E3DFD3" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString('en-IN')} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: '#1A1F2B' }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => v.toLocaleString('en-IN')} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="value" fill="#1F6F63" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Channel performance — ROAS">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.channelPerformance}>
                    <CartesianGrid vertical={false} stroke="#E3DFD3" />
                    <XAxis dataKey="channel" tick={{ fontSize: 10.5, fill: '#5B6472' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} width={30} tickFormatter={(v) => `${v}x`} />
                    <Tooltip formatter={(v) => `${v}x`} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E3DFD3' }} />
                    <Bar dataKey="roas" fill="#C98A3E" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <Panel title="Campaign comparison — sorted by ROAS">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="data-table">
                  <thead>
                    <tr><th>Campaign</th><th>Channel</th><th>Status</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Conversions</th><th>CTR</th></tr>
                  </thead>
                  <tbody>
                    {data.campaignComparison.map((c) => (
                      <tr key={c.id}>
                        <td className="font-medium">{c.name}</td>
                        <td>{c.channel}</td>
                        <td><StatusPill status={c.status} /></td>
                        <td className="num">{formatINR(c.spend)}</td>
                        <td className="num">{formatINR(c.revenue)}</td>
                        <td className="num font-medium">{c.roas}x</td>
                        <td className="num">{c.conversions}</td>
                        <td className="num">{c.ctrPct}%</td>
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
