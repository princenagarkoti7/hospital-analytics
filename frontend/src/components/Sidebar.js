'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  ListFilter
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname() || '';
  const [collapsed, setCollapsed] = useState(false);

  const lowerPath = pathname.toLowerCase();
  const isHcc = lowerPath.includes('icdcode') || lowerPath.includes('hcc');
  const isReadmission = lowerPath.includes('readmission');

  let workspaceTitle = 'ADMISSION WORKSPACE';
  let navItems = [];

  if (isHcc) {
    // 2 tabs for HCC Version Workspace
    workspaceTitle = 'HCC Version WORKSPACE';
    navItems = [
      {
        name: 'Dashboard',
        href: '/ICDcodes/Dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'Provider List',
        href: '/ICDcodes/ProviderList',
        icon: ListFilter,
      }
    ];
  } else if (isReadmission) {
    // 3 tabs for Readmission
    workspaceTitle = 'READMISSION WORKSPACE';
    navItems = [
      {
        name: 'Readmission Diagnostics',
        href: '/Readmission',
        icon: Stethoscope,
      },
      {
        name: 'Member List',
        href: '/Readmission/PatientList',
        icon: Users,
      },
      {
        name: 'Member Profile',
        href: '/Readmission/PatientList/PatientProfile',
        icon: UserCheck,
      }
    ];
  } else {
    // 3 tabs for Admission
    workspaceTitle = 'ADMISSION WORKSPACE';
    navItems = [
      {
        name: 'Admission Diagnostics',
        href: '/Admission',
        icon: Stethoscope,
      },
      {
        name: 'Member List',
        href: '/Admission/PatientList',
        icon: Users,
      },
      {
        name: 'Member Profile',
        href: '/Admission/PatientList/PatientProfile',
        icon: UserCheck,
      }
    ];
  }

  return (
    <aside
      className={`relative border-r border-slate-200 bg-white transition-all duration-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle collapse button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 cursor-pointer"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Workspace Header */}
      <div className="px-4 pt-6 pb-2">
        {!collapsed ? (
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {workspaceTitle}
          </p>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* Nav items */}
      <nav className="mt-2 flex-1 space-y-1.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/Admission' &&
              item.href !== '/Readmission' &&
              pathname.toLowerCase().startsWith(item.href.toLowerCase()));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-extrabold border border-sky-200/60'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                size={18}
                className={`shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}