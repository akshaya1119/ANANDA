import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Layers,
  Users,
  FileText,
  User,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isMobileOpen, setIsMobileOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Load saved collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('ananda_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('ananda_sidebar_collapsed', nextState.toString());
      return nextState;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Layers },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-[#0f172a] text-slate-100 border-r border-slate-800 transition-all duration-300 ease-in-out lg:sticky h-screen shrink-0 ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[250px]'
        } ${
          isMobileOpen
            ? 'translate-x-0 w-[250px]'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header / Brand */}
        <div>
          <div className="flex items-center justify-between h-[64px] px-4 border-b border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              {(!isCollapsed || isMobileOpen) && (
                <span className="font-extrabold text-white text-base tracking-tight whitespace-nowrap">
                  ANANDA
                </span>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar Collapse"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#4f46e5] text-white font-semibold shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                    } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - User Profile & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {(!isCollapsed || isMobileOpen) && user && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800/80 overflow-hidden">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-white font-bold text-xs shrink-0">
                {(user.FullName || user.UserName || 'A')[0].toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {user.FullName || user.UserName || 'Administrator'}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user.Role || 'Admin'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            title="Sign Out"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 font-medium text-xs transition-colors whitespace-nowrap ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
