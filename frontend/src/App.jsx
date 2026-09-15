import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DashboardLayout from './pages/DashboardLayout.jsx';
import Executive from './pages/Executive.jsx';
import Outlets from './pages/Outlets.jsx';
import Inventory from './pages/Inventory.jsx';
import Staff from './pages/Staff.jsx';
import Marketing from './pages/Marketing.jsx';
import Sales from './pages/Sales.jsx';
import Audit from './pages/Audit.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="executive" replace />} />
        <Route path="executive" element={<Executive />} />
        <Route path="outlets" element={<Outlets />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="staff" element={<Staff />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="sales" element={<Sales />} />
        <Route path="audit" element={<Audit />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
