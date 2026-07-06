import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Users, CalendarCheck, FileText, LogOut, Clock, Menu, X, Search } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { authService } from '../services/authService';
import { attendanceService } from '../services/attendanceService';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

const navItems = [
  { name: 'Panel GeoAsisto', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Oficinas', path: '/zones', icon: MapPin },
  { name: 'Turnos', path: '/shifts', icon: Clock },
  { name: 'Empleados', path: '/employees', icon: Users },
  { name: 'Asistencia', path: '/attendance', icon: CalendarCheck },
  { name: 'Permisos', path: '/leaves', icon: FileText },
];

export const AdminLayout: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: attendanceService.getAllLeaveRequests,
  });

  const pendingLeavesCount = leaves.filter(l => l.status === 'pending').length;

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden relative">

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-sm z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo/Brand */}
        <div className="h-24 flex items-center px-6 bg-primary-800 sticky top-0 z-10 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <img src="/logo_white.png" alt="GeoAsistencia" className="h-12 w-auto" />
            <span className="text-white font-bold text-xl tracking-[0.15em]">GEOASISTO</span>
          </div>
          <button
            className="ml-auto md:hidden text-white/80 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto sidebar-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/50"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
              
              {item.path === '/leaves' && pendingLeavesCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in zoom-in duration-300">
                  {pendingLeavesCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
              {user?.displayName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName || 'Administrador'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 w-full relative">

        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 shadow-sm z-30 relative">
          {/* Spacer para flex-between */}
          <div className="w-10"></div>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="text-primary-800 font-bold text-lg tracking-[0.1em]">GEOASISTO</span>
          </div>

          <button
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Top Header (Visible on Desktop) */}
        <div className="hidden md:flex bg-white px-8 py-4 border-b border-slate-200 items-center justify-between shrink-0 z-20">
          <div className="flex-1 max-w-md">
            <div className="flex items-center bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm w-full focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
              <Search className="w-5 h-5 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Buscar por cédula o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-4"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold text-sm">Salir</span>
          </button>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="mx-auto w-full h-full max-w-[1400px]">
            <Outlet context={{ searchQuery }} />
          </div>
        </div>
      </main>
    </div>
  );
};
