import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store, Boxes, Users, Megaphone, Receipt, ShieldCheck, Bell, LayoutGrid, ArrowRight,
} from 'lucide-react';

const MODULES = [
  { icon: Store, name: 'Outlets', copy: 'Rank every store on sales, margin, footfall and target achievement, then drill from region down to a single outlet.' },
  { icon: Boxes, name: 'Inventory', copy: 'Track stock cover, reorder alerts and wastage across the network so the right product is in the right store.' },
  { icon: Users, name: 'Staff', copy: 'See attendance, productivity, overtime and shift coverage — staffed correctly, not just staffed.' },
  { icon: Megaphone, name: 'Marketing', copy: 'Compare campaigns on ROAS and conversion, not reach alone, across Instagram, Google Ads, SMS and email.' },
  { icon: Receipt, name: 'Sales', copy: 'Product and category performance, discount impact, and daily trend lines for every outlet.' },
  { icon: ShieldCheck, name: 'Audit', copy: 'Compliance scores, violation severity, and corrective actions tracked from open to verified.' },
  { icon: Bell, name: 'Notifications', copy: 'Email, SMS and push alerts with escalation rules, so nothing urgent sits unread.' },
  { icon: LayoutGrid, name: 'Executive', copy: 'A weighted health score per outlet with rule-based risk detection and specific recommendations.' },
];

const FLOW = [
  { step: '1', title: 'Collect', copy: 'POS, inventory, HR and marketing data land in one place, outlet by outlet.' },
  { step: '2', title: 'Store', copy: 'A single relational schema keyed by outlet and date, ready to query.' },
  { step: '3', title: 'Transform', copy: 'Raw rows become KPIs — margin, stock cover, compliance score, ROAS.' },
  { step: '4', title: 'Visualize', copy: 'Each function gets a dashboard built around the decisions it owns.' },
  { step: '5', title: 'Act', copy: 'Alerts and recommendations turn a number into an owned, dated task.' },
];

export default function Landing() {
  return (
    <div className="bg-canvas min-h-screen">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="font-serif text-[20px] text-ink2">FranchiseOps</div>
        <nav className="flex items-center gap-6 text-[14px]">
          <Link to="/login" className="text-ink2 hover:text-teal-700">Log in</Link>
          <Link to="/register" className="bg-ink text-white px-4 py-2 rounded-sm text-[13.5px] hover:bg-ink-700">
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-20 grid md:grid-cols-[1.1fr,0.9fr] gap-12 items-center">
        <div>
          <p className="text-[13px] text-teal-700 font-medium mb-4">Franchise analytics &amp; management system</p>
          <h1 className="font-serif text-[44px] leading-[1.08] text-ink2 max-w-lg">
            Eight functions of a franchise business, run from one operating system.
          </h1>
          <p className="text-[15.5px] text-muted mt-5 max-w-md leading-relaxed">
            Kaffeine Central runs outlets, inventory, staff, marketing, sales, audits and alerts
            through a single data model — so a stock-out, a missed shift and a falling audit score
            are visible the same afternoon they happen, not the following month.
          </p>
          <div className="flex items-center gap-4 mt-8">
            <Link to="/register" className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-sm text-[14px] hover:bg-teal-700">
              Create an account <ArrowRight size={15} />
            </Link>
            <Link to="/login" className="text-[14px] text-ink2 underline underline-offset-4 decoration-line">
              I already have one
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Network snapshot</span>
            <span className="pill bg-teal-50 text-teal-700 border-teal-100">Live demo data</span>
          </div>
          <div className="grid grid-cols-2">
            {[
              ['₹35.3L', 'Network sales, 30d'],
              ['8', 'Outlets across 6 cities'],
              ['82.5%', 'Avg. compliance score'],
              ['74.5%', 'Alert acknowledgement rate'],
            ].map(([value, label]) => (
              <div key={label} className="px-5 py-5 border-b border-line even:border-l [&:nth-last-child(-n+2)]:border-b-0">
                <div className="kpi-value num text-[24px]">{value}</div>
                <div className="kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="font-serif text-[26px] text-ink2 mb-1">Every module, one data model</h2>
        <p className="text-[14.5px] text-muted mb-8 max-w-lg">
          Each dashboard answers a specific operating question and shares the same outlet and product data underneath.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-line">
          {MODULES.map(({ icon: Icon, name, copy }) => (
            <div key={name} className="border-r border-b border-line px-5 py-6">
              <Icon size={18} strokeWidth={1.6} className="text-teal-600 mb-3" />
              <div className="text-[14.5px] font-medium text-ink2 mb-1.5">{name}</div>
              <p className="text-[13px] text-muted leading-relaxed">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data flow */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="font-serif text-[26px] text-ink2 mb-1">How data becomes a decision</h2>
        <p className="text-[14.5px] text-muted mb-8 max-w-lg">Every dashboard starts with a data source and ends with a business action.</p>
        <div className="grid md:grid-cols-5 gap-px bg-line">
          {FLOW.map((f) => (
            <div key={f.step} className="bg-white px-5 py-6">
              <div className="font-serif text-[22px] text-teal-600 mb-2">{f.step}</div>
              <div className="text-[14px] font-medium text-ink2 mb-1.5">{f.title}</div>
              <p className="text-[12.5px] text-muted leading-relaxed">{f.copy}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
