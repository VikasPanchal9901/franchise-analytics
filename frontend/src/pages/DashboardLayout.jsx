import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { SocketProvider } from '../context/SocketContext.jsx';

export default function DashboardLayout() {
  return (
    <SocketProvider>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </SocketProvider>
  );
}
