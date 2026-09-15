import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Store, Boxes, Users, Megaphone, Receipt, ShieldCheck, Bell, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/app/executive', label: 'Executive', icon: LayoutGrid },
  { to: '/app/outlets', label: 'Outlets', icon: Store },
  { to: '/app/inventory', label: 'Inventory', icon: Boxes },
  { to: '/app/staff', label: 'Staff', icon: Users },
  { to: '/app/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/app/sales', label: 'Sales', icon: Receipt },
  { to: '/app/audit', label: 'Audit', icon: ShieldCheck },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-ink text-white/90 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="font-serif text-[19px] text-white leading-none">FranchiseOps</div>
        <div className="text-[11px] text-white/45 mt-1 tracking-wide">Kaffeine Central Network</div>
      </div>

      <nav className="flex-1 overflow-y-auto thin-scroll py-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-3 my-0.5 px-3 py-2 rounded-sm text-[13.5px] transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <div className="text-[13px] text-white/90">{user?.name}</div>
          <div className="text-[11px] text-white/45 capitalize">{user?.role?.replace('_', ' ')}</div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 rounded-sm"
        >
          <LogOut size={15} strokeWidth={1.75} /> Sign out
        </button>
      </div>
    </aside>
  );
}
