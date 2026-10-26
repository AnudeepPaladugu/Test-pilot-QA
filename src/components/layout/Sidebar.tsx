/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Layers,
  PlayCircle,
  Bug,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useStorage } from '../../context/StorageContext';

export type NavTab =
  | 'dashboard'
  | 'projects'
  | 'test-cases'
  | 'test-suites'
  | 'test-runs'
  | 'defects'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { activeProject, testCases, defects, isCloudConnected } = useStorage();

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'test-cases', label: 'Test Cases', icon: ListChecks, count: testCases.length },
    { id: 'test-suites', label: 'Test Suites', icon: Layers },
    { id: 'test-runs', label: 'Test Runs', icon: PlayCircle },
    { id: 'defects', label: 'Defects', icon: Bug, count: defects.filter((d) => d.status !== 'Closed').length },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Cloud DB', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Zone */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3767D5] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                TestPilot QA
              </span>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Test Architect Console
              </div>
            </div>
          </div>
        </div>

        {/* Current Workspace Info */}
        {activeProject ? (
          <div className="px-4 py-3 mx-3 my-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Active Project
            </div>
            <div className="flex items-center justify-between">
              <div className="truncate font-semibold text-xs text-slate-900">
                {activeProject.name}
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-[#3767D5] font-bold">
                {activeProject.key}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{activeProject.environment}</span>
              <span className="capitalize">{activeProject.status}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 mx-3 my-2 text-xs text-slate-500 bg-slate-50 rounded-lg">
            No active project selected.
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#3767D5]/10 text-[#3767D5] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3767D5]' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                      isActive
                        ? 'bg-[#3767D5] text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Database & System Info Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={() => {
              onSelectTab('settings');
              onClose();
            }}
            className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className="text-[11px] font-semibold text-slate-800">
                  {isCloudConnected ? 'Cloud Firestore' : 'Local Demo Mode'}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {isCloudConnected ? 'Connected & synced' : 'In-browser persistent'}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
