import React from 'react';
import { User, Shield, Key, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, jwtDecoded, loginTime, logout } = useAuth();

  const formattedLoginTime = loginTime
    ? new Date(Number(loginTime)).toLocaleString()
    : 'Active Session';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-600/20">
            {(user?.FullName || user?.UserName || 'A')[0].toUpperCase()}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              {user?.FullName || user?.UserName || 'Administrator'}
            </h2>
            <p className="text-slate-500 text-sm flex items-center justify-center sm:justify-start gap-2">
              <Shield size={16} className="text-indigo-600" />
              <span>{user?.Role || jwtDecoded?.role || 'System Administrator'}</span>
            </p>
            <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Active Encrypted Session
              </span>
              <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-md font-semibold">
                ID: {user?.UserId || user?.Id || 'USR1001'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User size={18} className="text-indigo-600" /> Account Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Username</span>
              <span className="font-mono text-slate-900 font-medium">{user?.UserName || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Full Name</span>
              <span className="text-slate-900 font-medium">{user?.FullName || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Role Status</span>
              <span className="text-emerald-700 font-semibold">{user?.Role || 'Administrator'}</span>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Key size={18} className="text-emerald-600" /> Security & Session
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Login Time</span>
              <span className="text-slate-900 font-medium">{formattedLoginTime}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Session Storage</span>
              <span className="text-slate-900 font-medium">SessionStorage (Encrypted)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Authentication</span>
              <span className="text-emerald-700 font-semibold text-xs">JWT Signed Token</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={logout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut size={16} /> Sign Out of Session
        </button>
      </div>
    </div>
  );
}
