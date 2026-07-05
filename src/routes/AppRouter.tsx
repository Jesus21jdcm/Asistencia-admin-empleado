import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ZonesPage } from '../pages/zones/ZonesPage';
import { ShiftsPage } from '../pages/shifts/ShiftsPage';
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { EmployeePage } from '../pages/employee/EmployeePage';

// Placeholder Pages for routing
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
    <h2 className="text-xl font-medium text-slate-700">{title} - En construcción</h2>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/zones" element={<ZonesPage />} />
              <Route path="/shifts" element={<ShiftsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/leaves" element={<PlaceholderPage title="Justificaciones" />} />
            </Route>
          </Route>

          {/* Employee Routes */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route path="/employee" element={<EmployeePage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
