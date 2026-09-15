import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { useSocket, useSocketEvent } from '../context/SocketContext.jsx';

export default function Topbar({ title, subtitle }) {
  const { connected } = useSocket();
  const [pulse, setPulse] = useState(false);

  useSocketEvent('sale:new', () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  });

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-line bg-canvas/95 backdrop-blur sticky top-0 z-10">
      <div>
        <h1 className="font-serif text-[22px] text-ink2 leading-none">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted mt-1.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <span className={`relative flex h-2 w-2 ${connected ? '' : 'opacity-40'}`}>
          {connected && <span className={`absolute inline-flex h-full w-full rounded-full bg-teal-500 ${pulse ? 'animate-ping' : ''}`} />}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-teal-600' : 'bg-muted'}`} />
        </span>
        {connected ? 'Live' : 'Connecting…'}
      </div>
    </header>
  );
}
