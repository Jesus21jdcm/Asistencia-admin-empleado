import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Users, CalendarCheck, FileText, LogOut } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { authService } from '../services/authService';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Geocercas', path: '/zones', icon: MapPin },
  { name: 'Empleados', path: '/employees', icon: Users },
  { name: 'Asistencia', path: '/attendance', icon: CalendarCheck },
  { name: 'Justificaciones', path: '/leaves', icon: FileText },
];

export const AdminLayout: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm relative z-20">
        {/* Logo/Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3 shadow-sm shadow-primary-500/20">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-slate-900 font-semibold text-lg tracking-tight">Admin Asistencia</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/50" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                {user?.displayName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName || 'Administrador'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="mx-auto w-full h-full max-w-[1400px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
