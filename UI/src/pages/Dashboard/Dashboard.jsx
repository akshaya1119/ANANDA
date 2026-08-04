import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  ClipboardList,
  User,
  Sliders,
  ArrowRight,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user, loginTime } = useAuth();
  const navigate = useNavigate();

  const formattedLoginTime = loginTime
    ? new Date(Number(loginTime)).toLocaleTimeString()
    : 'Active';

  const stats = [
    {
      title: 'Student Directory',
      value: 'Access Records',
      description: 'Manage & verify student credentials',
      icon: Users,
      color: 'border-indigo-200 text-indigo-700 bg-indigo-50',
      action: () => navigate('/students'),
    },
    {
      title: 'Audit Logs',
      value: 'System Events',
      description: 'Review admin activities & security logs',
      icon: ClipboardList,
      color: 'border-emerald-200 text-emerald-700 bg-emerald-50',
      action: () => navigate('/audit-logs'),
    },
    {
      title: 'Admin Profile',
      value: user?.UserName || 'Admin',
      description: 'View active session credentials',
      icon: User,
      color: 'border-purple-200 text-purple-700 bg-purple-50',
      action: () => navigate('/profile'),
    },
    {
      title: 'System Settings',
      value: 'Configuration',
      description: 'API base & database parameters',
      icon: Sliders,
      color: 'border-amber-200 text-amber-700 bg-amber-50',
      action: () => navigate('/settings'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="p-6 md:p-8 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Activity size={16} /> ANANDA Admin Operations Hub
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Welcome back, {user?.FullName || user?.UserName || 'Administrator'}!
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your encrypted admin session is active. Access operations from the navigation menu or quick links below.
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/students')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users size={16} /> Student Directory <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/audit-logs')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg border border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ClipboardList size={16} /> Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={stat.action}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg border ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.title}
                </h3>
                <p className="text-base font-bold text-slate-900 mt-1">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Session Info Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Session Security Active</h4>
            <p className="text-xs text-slate-500">Authenticated via Encrypted SessionStorage &bull; Logged in at {formattedLoginTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <CheckCircle size={14} /> Session Verified
        </div>
      </div>
    </div>
  );
}
