/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, Plus, ChevronDown, Check, Database, ExternalLink } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';
import { NavTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavTab;
  onOpenMobileMenu: () => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenNewCaseModal: () => void;
  onOpenNewRunModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onSelectTab,
  onOpenNewCaseModal,
  onOpenNewRunModal,
}) => {
  const { projects, activeProject, setActiveProjectId, isCloudConnected, storageModeName } = useStorage();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return 'QA Dashboard';
      case 'projects':
        return 'Projects';
      case 'test-cases':
        return 'Test Cases';
      case 'test-suites':
        return 'Test Suites';
      case 'test-runs':
        return 'Test Runs & Execution';
      case 'defects':
        return 'Defect Tracking';
      case 'reports':
        return 'Reports & Analytics';
      case 'settings':
        return 'Settings & Cloud DB';
      default:
        return 'Workspace';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between gap-8 sticky top-0 z-30">
      {/* Zone 1: Mobile toggle + Breadcrumb & Project Selector */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProjectDropdownOpen(!projectDropdownOpen);
              setQuickActionOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-[#3767D5]" />
            <span className="truncate max-w-[140px] md:max-w-[200px]">
              {activeProject ? activeProject.name : 'Select Project'}
            </span>
            {activeProject && (
              <span className="px-1 py-0.2 rounded font-mono text-[10px] bg-slate-200 text-slate-700">
                {activeProject.key}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {projectDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProjectDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Switch Active Project
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {projects.map((p) => {
                    const isSelected = activeProject?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActiveProjectId(p.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50/70 text-[#3767D5] font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold">{p.key}</span>
                            <span>·</span>
                            <span>{p.environment}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#3767D5] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    onClick={() => {
                      onSelectTab('projects');
                      setProjectDropdownOpen(false);
                    }}
                    className="w-full text-center py-1.5 text-xs text-[#3767D5] font-semibold hover:bg-blue-50/50 rounded-lg transition-colors"
                  >
                    Manage Projects
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <span className="hidden sm:inline text-slate-300">/</span>

        <h1 className="hidden sm:block text-sm font-semibold text-slate-800 whitespace-nowrap">
          {getTabTitle(currentTab)}
        </h1>
      </div>

      {/* Zone 2: Storage Mode Badge & Link */}
      <div className="hidden lg:flex items-center gap-2 text-xs">
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
            isCloudConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
          title="Click to view database settings"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{storageModeName}</span>
          <span className="text-[10px] underline opacity-75">Config</span>
        </button>
      </div>

      {/* Zone 3: Quick Action + New Run / Case button */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative">
          <button
            onClick={() => {
              setQuickActionOpen(!quickActionOpen);
              setProjectDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Action</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {quickActionOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickActionOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenNewCaseModal();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>New Test Case</span>
                  <span className="text-[10px] text-slate-400 font-mono">TC</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenNewRunModal();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>New Test Run</span>
                  <span className="text-[10px] text-slate-400 font-mono">TR</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onSelectTab('defects');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Log Defect</span>
                  <span className="text-[10px] text-slate-400 font-mono">BUG</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
