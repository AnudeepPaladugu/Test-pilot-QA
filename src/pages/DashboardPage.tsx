/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import { calculateRunSummary } from '../utils/qaCalculations';
import { ResultBadge, PriorityBadge, StatusBadge } from '../components/common/Badge';
import { NavTab } from '../components/layout/Sidebar';
import {
  ListChecks,
  PlayCircle,
  Bug,
  Layers,
  ArrowUpRight,
  Plus,
  BarChart2,
  FolderKanban,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenNewCaseModal: () => void;
  onOpenNewRunModal: () => void;
  onOpenTestRunner: (runId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewCaseModal,
  onOpenNewRunModal,
  onOpenTestRunner,
}) => {
  const {
    projects,
    activeProject,
    testSuites,
    testCases,
    testRuns,
    executions,
    defects,
    storageModeName,
  } = useStorage();

  // Aggregate project statistics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalCases = testCases.length;
    const totalSuites = testSuites.length;
    const totalRuns = testRuns.length;

    // Execution totals across all runs in this project
    const execMap = new Map<string, string>(); // runId:tcId -> result
    for (const e of executions) {
      execMap.set(`${e.runId}:${e.testCaseId}`, e.result);
    }

    let passedExecs = 0;
    let failedExecs = 0;
    let blockedExecs = 0;
    let notRunExecs = 0;

    for (const run of testRuns) {
      for (const tcId of run.testCaseIds) {
        const res = execMap.get(`${run.id}:${tcId}`) || 'Not Run';
        if (res === 'Passed') passedExecs++;
        else if (res === 'Failed') failedExecs++;
        else if (res === 'Blocked') blockedExecs++;
        else notRunExecs++;
      }
    }

    const totalScheduled = passedExecs + failedExecs + blockedExecs + notRunExecs;
    const completedExecs = passedExecs + failedExecs + blockedExecs;
    const evaluatedExecs = passedExecs + failedExecs;
    const passRate = evaluatedExecs > 0 ? Math.round((passedExecs / evaluatedExecs) * 100) : null;
    const completionRate = totalScheduled > 0 ? Math.round((completedExecs / totalScheduled) * 100) : 0;

    // Defects
    const openDefects = defects.filter((d) => d.status !== 'Closed').length;
    const criticalHighDefects = defects.filter(
      (d) => (d.severity === 'Critical' || d.severity === 'High') && d.status !== 'Closed'
    ).length;

    return {
      totalProjects,
      totalCases,
      totalSuites,
      totalRuns,
      passedExecs,
      failedExecs,
      blockedExecs,
      notRunExecs,
      totalScheduled,
      passRate,
      completionRate,
      openDefects,
      criticalHighDefects,
    };
  }, [projects, activeProject, testSuites, testCases, testRuns, executions, defects]);

  const recentRuns = useMemo(() => {
    return [...testRuns].slice(0, 4);
  }, [testRuns]);

  const recentDefects = useMemo(() => {
    return [...defects].slice(0, 5);
  }, [defects]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Project: <strong className="text-slate-800">{activeProject?.name || 'None'}</strong></span>
            <span>·</span>
            <span>Key: <code className="font-mono font-bold text-[#3767D5]">{activeProject?.key || 'N/A'}</code></span>
            <span>·</span>
            <span>Env: <strong className="text-slate-800">{activeProject?.environment || 'N/A'}</strong></span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quality Assurance Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Real-time manual testing metrics, active test execution cycles, and defect triage for{' '}
            {activeProject ? activeProject.name : 'your project'}.
          </p>
        </div>

        {/* Quick action strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenNewCaseModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Case</span>
          </button>
          <button
            onClick={onOpenNewRunModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>New Test Run</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Test Cases */}
        <div
          onClick={() => onNavigate('test-cases')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Test Cases
            </span>
            <ListChecks className="w-4 h-4 text-slate-400 group-hover:text-[#3767D5] transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {stats.totalCases}
            </span>
            <span className="text-xs text-slate-500">in {stats.totalSuites} suites</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Module coverage</span>
            <span className="text-[#3767D5] font-semibold group-hover:underline flex items-center gap-0.5">
              Manage <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Test Runs & Pass Rate */}
        <div
          onClick={() => onNavigate('test-runs')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pass Rate
            </span>
            <PlayCircle className="w-4 h-4 text-slate-400 group-hover:text-[#3767D5] transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {stats.passRate !== null ? `${stats.passRate}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({stats.passedExecs} passed / {stats.passedExecs + stats.failedExecs} evaluated)
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{stats.totalRuns} total test runs</span>
            <span className="text-[#3767D5] font-semibold group-hover:underline flex items-center gap-0.5">
              Runs <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Execution Completion */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completion Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {stats.completionRate}%
            </span>
            <span className="text-xs text-slate-500">executed</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{stats.notRunExecs} pending execution</span>
            <span className="text-[#3767D5] font-semibold group-hover:underline flex items-center gap-0.5">
              Details <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Defects */}
        <div
          onClick={() => onNavigate('defects')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Open Defects
            </span>
            <Bug className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {stats.openDefects}
            </span>
            {stats.criticalHighDefects > 0 && (
              <span className="text-xs font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                {stats.criticalHighDefects} Critical/High
              </span>
            )}
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Active bug backlog</span>
            <span className="text-[#3767D5] font-semibold group-hover:underline flex items-center gap-0.5">
              View <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Execution Distribution Strip */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Execution Distribution</h3>
            <p className="text-xs text-slate-500">
              Summary of all {stats.totalScheduled} test case assignments across active runs.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#16845B]" />
              <span className="text-slate-700">Passed: <strong>{stats.passedExecs}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C43F50]" />
              <span className="text-slate-700">Failed: <strong>{stats.failedExecs}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#B7791F]" />
              <span className="text-slate-700">Blocked: <strong>{stats.blockedExecs}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#718096]" />
              <span className="text-slate-700">Not Run: <strong>{stats.notRunExecs}</strong></span>
            </div>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          {stats.totalScheduled > 0 ? (
            <>
              <div
                style={{ width: `${(stats.passedExecs / stats.totalScheduled) * 100}%` }}
                className="bg-[#16845B] transition-all duration-300"
                title={`Passed: ${stats.passedExecs}`}
              />
              <div
                style={{ width: `${(stats.failedExecs / stats.totalScheduled) * 100}%` }}
                className="bg-[#C43F50] transition-all duration-300"
                title={`Failed: ${stats.failedExecs}`}
              />
              <div
                style={{ width: `${(stats.blockedExecs / stats.totalScheduled) * 100}%` }}
                className="bg-[#B7791F] transition-all duration-300"
                title={`Blocked: ${stats.blockedExecs}`}
              />
              <div
                style={{ width: `${(stats.notRunExecs / stats.totalScheduled) * 100}%` }}
                className="bg-[#718096] transition-all duration-300"
                title={`Not Run: ${stats.notRunExecs}`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-slate-200" />
          )}
        </div>
      </div>

      {/* Two Column Layout: Recent Test Runs & Recent Defects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Test Runs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Test Runs</h3>
              <p className="text-xs text-slate-500">Test execution cycles for this project</p>
            </div>
            <button
              onClick={() => onNavigate('test-runs')}
              className="text-xs font-semibold text-[#3767D5] hover:underline"
            >
              View all ({testRuns.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No test runs created yet. Click "New Test Run" above.
              </div>
            ) : (
              recentRuns.map((run) => {
                const runSummary = calculateRunSummary(run.testCaseIds, executions.filter((e) => e.runId === run.id));
                return (
                  <div key={run.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700">{run.id}</span>
                          <span className="text-xs font-semibold text-slate-900">{run.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                          <span>Env: {run.environment}</span>
                          <span>·</span>
                          <span className="font-mono">{run.buildVersion}</span>
                          <span>·</span>
                          <span>{run.testCaseIds.length} test cases</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={run.status} />
                        <button
                          onClick={() => onOpenTestRunner(run.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#3767D5] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          Execute
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${runSummary.completionPercentage}%` }}
                          className="bg-[#3767D5]"
                        />
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-600 font-medium">
                        {runSummary.completionPercentage}% ({runSummary.completed}/{runSummary.total})
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Defects */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Defects</h3>
              <p className="text-xs text-slate-500">Tracked issues and failed test links</p>
            </div>
            <button
              onClick={() => onNavigate('defects')}
              className="text-xs font-semibold text-[#3767D5] hover:underline"
            >
              View all ({defects.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentDefects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No defects logged. When a test run fails, you can log a defect directly.
              </div>
            ) : (
              recentDefects.map((defect) => (
                <div key={defect.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rose-600">{defect.id}</span>
                        <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                          {defect.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>Severity: {defect.severity}</span>
                        <span>·</span>
                        <span>Priority: {defect.priority}</span>
                        {defect.linkedTestCaseId && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-600">
                              Linked: {defect.linkedTestCaseId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={defect.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
