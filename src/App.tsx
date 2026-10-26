/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StorageProvider } from './context/StorageContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ToastContainer } from './components/common/ToastContainer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { TestSuitesPage } from './pages/TestSuitesPage';
import { TestRunsPage } from './pages/TestRunsPage';
import { DefectsPage } from './pages/DefectsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Quick Action Modal states
  const [openNewCaseModal, setOpenNewCaseModal] = useState(false);
  const [openNewRunModal, setOpenNewRunModal] = useState(false);
  const [selectedRunnerRunId, setSelectedRunnerRunId] = useState<string | undefined>(undefined);

  // Linked defect from failed execution
  const [prefilledDefect, setPrefilledDefect] = useState<{
    title: string;
    projectId: string;
    linkedTestCaseId: string;
    linkedTestRunId: string;
    linkedExecutionId: string;
    actualResult: string;
    expectedResult: string;
    stepsToReproduce: string;
    environment: string;
    buildVersion: string;
  } | null>(null);

  const handleLaunchRunner = (runId: string) => {
    setSelectedRunnerRunId(runId);
    setCurrentTab('test-runs');
  };

  const handleOpenDefectFromRun = (data: {
    title: string;
    projectId: string;
    linkedTestCaseId: string;
    linkedTestRunId: string;
    linkedExecutionId: string;
    actualResult: string;
    expectedResult: string;
    stepsToReproduce: string;
    environment: string;
    buildVersion: string;
  }) => {
    setPrefilledDefect(data);
    setCurrentTab('defects');
  };

  return (
    <div className="flex h-screen bg-[#F5F7FB] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'test-runs') setSelectedRunnerRunId(undefined);
        }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'test-runs') setSelectedRunnerRunId(undefined);
          }}
          onOpenNewCaseModal={() => {
            setCurrentTab('test-cases');
            setOpenNewCaseModal(true);
          }}
          onOpenNewRunModal={() => {
            setCurrentTab('test-runs');
            setOpenNewRunModal(true);
          }}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardPage
                onNavigate={(tab) => {
                  setCurrentTab(tab);
                  if (tab !== 'test-runs') setSelectedRunnerRunId(undefined);
                }}
                onOpenNewCaseModal={() => {
                  setCurrentTab('test-cases');
                  setOpenNewCaseModal(true);
                }}
                onOpenNewRunModal={() => {
                  setCurrentTab('test-runs');
                  setOpenNewRunModal(true);
                }}
                onOpenTestRunner={handleLaunchRunner}
              />
            )}

            {currentTab === 'projects' && <ProjectsPage />}

            {currentTab === 'test-cases' && (
              <TestCasesPage
                initialCreateModalOpen={openNewCaseModal}
                onCloseInitialCreateModal={() => setOpenNewCaseModal(false)}
              />
            )}

            {currentTab === 'test-suites' && (
              <TestSuitesPage
                onNavigateToCasesWithSuite={(suiteId) => {
                  setCurrentTab('test-cases');
                }}
              />
            )}

            {currentTab === 'test-runs' && (
              <TestRunsPage
                initialCreateModalOpen={openNewRunModal}
                onCloseInitialCreateModal={() => setOpenNewRunModal(false)}
                initialSelectedRunId={selectedRunnerRunId}
                onOpenDefectForExecution={handleOpenDefectFromRun}
              />
            )}

            {currentTab === 'defects' && (
              <DefectsPage
                prefilledDefectData={prefilledDefect}
                onClearPrefilledDefect={() => setPrefilledDefect(null)}
              />
            )}

            {currentTab === 'reports' && <ReportsPage />}

            {currentTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* Global Toast Alerts */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <StorageProvider>
      <AppContent />
    </StorageProvider>
  );
}
