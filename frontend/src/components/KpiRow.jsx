import React from 'react';

/**
 * items: [{ label, value, delta, deltaGood }]
 * Renders as a single hairline-divided row — the "ledger" KPI strip used
 * throughout the app instead of a grid of identical shadow-cards.
 */
export default function KpiRow({ items }) {
  return (
    <div className="panel grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((item, i) => (
        <div key={item.label} className={`px-5 py-4 ${i !== 0 ? 'border-l border-line' : ''}`}>
          <div className="kpi-value num">{item.value}</div>
          <div className="kpi-label flex items-center gap-1.5">
            {item.label}
            {item.delta !== undefined && item.delta !== null && (
              <span className={`text-[11.5px] font-medium ${item.deltaGood ? 'text-success-600' : 'text-critical-600'}`}>
                {item.delta > 0 ? '+' : ''}{item.delta}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
