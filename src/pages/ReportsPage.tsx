/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import {
  exportReportSummaryToCsv,
  exportTestCasesToCsv,
  exportDefectsToCsv,
  exportExecutionsToCsv,
} from '../utils/csvExport';
import { calculateRunSummary } from '../utils/qaCalculations';
import { PriorityBadge, StatusBadge, ResultBadge } from '../components/common/Badge';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Bug,
  ListChecks,
  PlayCircle,
  Info,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { activeProject, testCases, testSuites, testRuns, executions, defects } = useStorage();

  const [selectedRunId, setSelectedRunId] = useState<string>('All');
  const [selectedResultFilter, setSelectedResultFilter] = useState<string>('All');

  // Filtered runs for calculation
  const targetRuns = useMemo(() => {
    if (selectedRunId === 'All') return testRuns;
    return testRuns.filter((r) => r.id === selectedRunId);
  }, [testRuns, selectedRunId]);

  // Target test case IDs included in these runs
  const targetCaseIds = useMemo(() => {
    const ids = new Set<string>();
    targetRuns.forEach((r) => r.testCaseIds.forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [targetRuns]);

  // Executions in target runs
  const targetExecutions = useMemo(() => {
    const runIds = new Set(targetRuns.map((r) => r.id));
    return executions.filter((e) => runIds.has(e.runId));
  }, [targetRuns, executions]);

  // Aggregate metrics
  const reportStats = useMemo(() => {
    const totalCases = testCases.length;
    const totalRuns = targetRuns.length;

    // Map: runId:tcId -> execution
    const execMap = new Map<string, string>();
    targetExecutions.forEach((e) => execMap.set(`${e.runId}:${e.testCaseId}`, e.result));

    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let notRun = 0;

    for (const r of targetRuns) {
      for (const tcId of r.testCaseIds) {
        const res = execMap.get(`${r.id}:${tcId}`) || 'Not Run';
        if (res === 'Passed') passed++;
        else if (res === 'Failed') failed++;
        else if (res === 'Blocked') blocked++;
        else notRun++;
      }
    }

    const totalScheduled = passed + failed + blocked + notRun;
    const completed = passed + failed + blocked;
    const evaluated = passed + failed;
    const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : null;
    const completionRate = totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0;

    // Defect severity breakdown
    const defectsBySeverity = {
      Critical: defects.filter((d) => d.severity === 'Critical').length,
      High: defects.filter((d) => d.severity === 'High').length,
      Medium: defects.filter((d) => d.severity === 'Medium').length,
      Low: defects.filter((d) => d.severity === 'Low').length,
    };

    // Defect status breakdown
    const defectsByStatus = {
      Open: defects.filter((d) => d.status === 'Open').length,
      InProgress: defects.filter((d) => d.status === 'In Progress').length,
      Fixed: defects.filter((d) => d.status === 'Fixed').length,
      Retest: defects.filter((d) => d.status === 'Retest').length,
      Closed: defects.filter((d) => d.status === 'Closed').length,
      Reopened: defects.filter((d) => d.status === 'Reopened').length,
    };

    return {
      totalCases,
      totalRuns,
      totalScheduled,
      passed,
      failed,
      blocked,
      notRun,
      completed,
      passRate,
      completionRate,
      defectsBySeverity,
      defectsByStatus,
      openDefectsCount: defects.filter((d) => d.status !== 'Closed').length,
      criticalHighDefectsCount: defectsBySeverity.Critical + defectsBySeverity.High,
    };
  }, [testCases, targetRuns, targetExecutions, defects]);

  // Export summary report
  const handleExportSummaryReport = () => {
    exportReportSummaryToCsv(
      {
        projectName: activeProject?.name || 'All Projects',
        generatedAt: new Date().toISOString(),
        totalCases: reportStats.totalCases,
        totalRuns: reportStats.totalRuns,
        totalExecutions: reportStats.totalScheduled,
        passedCount: reportStats.passed,
        failedCount: reportStats.failed,
        blockedCount: reportStats.blocked,
        notRunCount: reportStats.notRun,
        passRate: reportStats.passRate !== null ? `${reportStats.passRate}%` : 'N/A',
        completionRate: `${reportStats.completionRate}%`,
        openDefects: reportStats.openDefectsCount,
        criticalHighDefects: reportStats.criticalHighDefectsCount,
      },
      `${activeProject?.key || 'QA'}-summary-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">QA Reports & Metrics</h2>
          <p className="text-xs text-slate-500 mt-1">
            Standardized metrics, execution pass ratios, and defect triage distributions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportSummaryReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Summary CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>Filter by Test Run:</span>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="All">All Test Runs</option>
              {testRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id}: {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Generated on {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pass Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Pass Rate</div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 tabular-nums">
            {reportStats.passRate !== null ? `${reportStats.passRate}%` : 'N/A'}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Passed / (Passed + Failed)
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Execution Completion</div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 tabular-nums">
            {reportStats.completionRate}%
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {reportStats.completed} of {reportStats.totalScheduled} executions
          </div>
        </div>

        {/* Total Executions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Executions</div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 tabular-nums">
            {reportStats.totalScheduled}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Across {reportStats.totalRuns} test runs
          </div>
        </div>

        {/* Open Defects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Active Defects</div>
          <div className="mt-2 text-3xl font-bold font-mono text-rose-600 tabular-nums">
            {reportStats.openDefectsCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {reportStats.criticalHighDefectsCount} Critical / High
          </div>
        </div>
      </div>

      {/* Execution Results Distribution Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Execution Status Distribution</h3>
          <p className="text-xs text-slate-500">
            Visual breakdown of verdicts across {reportStats.totalScheduled} scheduled executions.
          </p>
        </div>

        {/* Segmented Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
          {reportStats.totalScheduled > 0 ? (
            <>
              <div
                style={{ width: `${(reportStats.passed / reportStats.totalScheduled) * 100}%` }}
                className="bg-[#16845B]"
                title={`Passed: ${reportStats.passed}`}
              />
              <div
                style={{ width: `${(reportStats.failed / reportStats.totalScheduled) * 100}%` }}
                className="bg-[#C43F50]"
                title={`Failed: ${reportStats.failed}`}
              />
              <div
                style={{ width: `${(reportStats.blocked / reportStats.totalScheduled) * 100}%` }}
                className="bg-[#B7791F]"
                title={`Blocked: ${reportStats.blocked}`}
              />
              <div
                style={{ width: `${(reportStats.notRun / reportStats.totalScheduled) * 100}%` }}
                className="bg-[#718096]"
                title={`Not Run: ${reportStats.notRun}`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-slate-200" />
          )}
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
            <span className="text-[11px] font-semibold text-[#16845B] uppercase">Passed</span>
            <div className="text-xl font-bold font-mono text-[#16845B] mt-0.5">
              {reportStats.passed}
            </div>
          </div>

          <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-lg">
            <span className="text-[11px] font-semibold text-[#C43F50] uppercase">Failed</span>
            <div className="text-xl font-bold font-mono text-[#C43F50] mt-0.5">
              {reportStats.failed}
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
            <span className="text-[11px] font-semibold text-[#B7791F] uppercase">Blocked</span>
            <div className="text-xl font-bold font-mono text-[#B7791F] mt-0.5">
              {reportStats.blocked}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-[#718096] uppercase">Not Run</span>
            <div className="text-xl font-bold font-mono text-[#718096] mt-0.5">
              {reportStats.notRun}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Defect Severities & Defect Statuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Defect Severity Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Defects by Severity</h3>
          <p className="text-xs text-slate-500 mb-4">Risk exposure distribution</p>

          <div className="space-y-3">
            {[
              { label: 'Critical', count: reportStats.defectsBySeverity.Critical, color: 'bg-rose-600' },
              { label: 'High', count: reportStats.defectsBySeverity.High, color: 'bg-amber-600' },
              { label: 'Medium', count: reportStats.defectsBySeverity.Medium, color: 'bg-blue-600' },
              { label: 'Low', count: reportStats.defectsBySeverity.Low, color: 'bg-slate-500' },
            ].map((sev) => {
              const pct = defects.length > 0 ? Math.round((sev.count / defects.length) * 100) : 0;
              return (
                <div key={sev.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{sev.label}</span>
                    <span className="font-mono text-slate-600 tabular-nums font-bold">
                      {sev.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className={`h-full ${sev.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Defect Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Defects by Workflow Status</h3>
          <p className="text-xs text-slate-500 mb-4">Lifecycle resolution progress</p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Open</span>
              <div className="text-lg font-bold font-mono text-rose-600 mt-1">
                {reportStats.defectsByStatus.Open}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">In Progress</span>
              <div className="text-lg font-bold font-mono text-blue-600 mt-1">
                {reportStats.defectsByStatus.InProgress}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Fixed</span>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                {reportStats.defectsByStatus.Fixed}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Ready for Retest</span>
              <div className="text-lg font-bold font-mono text-amber-600 mt-1">
                {reportStats.defectsByStatus.Retest}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Closed</span>
              <div className="text-lg font-bold font-mono text-slate-700 mt-1">
                {reportStats.defectsByStatus.Closed}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Reopened</span>
              <div className="text-lg font-bold font-mono text-rose-700 mt-1">
                {reportStats.defectsByStatus.Reopened}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Export Quick Center */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Export Data Records</h3>
        <p className="text-xs text-slate-500 mb-4">
          Download sanitized, RFC 4180 compliant CSV files with formula-injection mitigation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => exportTestCasesToCsv(testCases, 'test-cases-export.csv')}
            className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-800"
          >
            <Download className="w-4 h-4 text-[#3767D5]" />
            <span>Export Test Cases ({testCases.length})</span>
          </button>

          <button
            onClick={() => exportDefectsToCsv(defects, 'defects-export.csv')}
            className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-800"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>Export Defects ({defects.length})</span>
          </button>

          <button
            onClick={handleExportSummaryReport}
            className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-800"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Metrics Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
};
