import React from 'react';
import { Outlet } from 'react-router-dom';

export default function OuterLayout() {
  return (
    <div className="min-h-screen w-full bg-slate-950">
      <Outlet />
    </div>
  );
}