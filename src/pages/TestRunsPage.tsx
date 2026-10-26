/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import {
  TestRun,
  TestExecution,
  ExecutionResult,
  Environment,
  RunStatus,
  TestCase,
} from '../types/qa';
import { calculateRunSummary } from '../utils/qaCalculations';
import { exportExecutionsToCsv } from '../utils/csvExport';
import { ResultBadge, StatusBadge, PriorityBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import {
  PlayCircle,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Bug,
  ChevronRight,
  ChevronLeft,
  X,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface TestRunsPageProps {
  initialCreateModalOpen?: boolean;
  onCloseInitialCreateModal?: () => void;
  initialSelectedRunId?: string;
  onOpenDefectForExecution?: (defectData: {
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
  }) => void;
}

export const TestRunsPage: React.FC<TestRunsPageProps> = ({
  initialCreateModalOpen = false,
  onCloseInitialCreateModal,
  initialSelectedRunId,
  onOpenDefectForExecution,
}) => {
  const {
    activeProject,
    testRuns,
    testCases,
    testSuites,
    executions,
    createTestRun,
    updateTestRun,
    deleteTestRun,
    recordExecution,
  } = useStorage();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | RunStatus>('All');

  // Create Run Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialCreateModalOpen);
  const [runName, setRunName] = useState('');
  const [runEnv, setRunEnv] = useState<Environment>('QA');
  const [buildVersion, setBuildVersion] = useState('');
  const [runDescription, setRunDescription] = useState('');
  const [selectedCaseIdsForRun, setSelectedCaseIdsForRun] = useState<string[]>([]);
  const [caseFilterSuite, setCaseFilterSuite] = useState<string>('All');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active Runner State
  const [activeRunnerRunId, setActiveRunnerRunId] = useState<string | null>(
    initialSelectedRunId || null
  );
  const [runnerSelectedCaseId, setRunnerSelectedCaseId] = useState<string | null>(null);
  const [actualResultInput, setActualResultInput] = useState('');
  const [executionNotesInput, setExecutionNotesInput] = useState('');

  // Confirm Complete Run Dialog
  const [isConfirmIncompleteDialogOpen, setIsConfirmIncompleteDialogOpen] = useState(false);

  // Delete Run Dialog
  const [runToDelete, setRunToDelete] = useState<TestRun | null>(null);

  // Active test run object for runner
  const activeRunnerRun = useMemo(() => {
    return testRuns.find((r) => r.id === activeRunnerRunId) || null;
  }, [testRuns, activeRunnerRunId]);

  // Test cases in active runner run
  const runnerTestCases = useMemo(() => {
    if (!activeRunnerRun) return [];
    return testCases.filter((tc) => activeRunnerRun.testCaseIds.includes(tc.id));
  }, [activeRunnerRun, testCases]);

  // Executions map for active runner run: testCaseId -> TestExecution
  const runnerExecutionsMap = useMemo(() => {
    if (!activeRunnerRun) return new Map<string, TestExecution>();
    const map = new Map<string, TestExecution>();
    for (const e of executions) {
      if (e.runId === activeRunnerRun.id) {
        map.set(e.testCaseId, e);
      }
    }
    return map;
  }, [activeRunnerRun, executions]);

  // Selected test case in runner
  const currentRunnerTestCase = useMemo(() => {
    if (!runnerTestCases.length) return null;
    if (runnerSelectedCaseId) {
      return runnerTestCases.find((tc) => tc.id === runnerSelectedCaseId) || runnerTestCases[0];
    }
    return runnerTestCases[0];
  }, [runnerTestCases, runnerSelectedCaseId]);

  // Whenever selected case in runner changes, populate inputs from stored execution
  const onSelectRunnerCase = (tcId: string) => {
    setRunnerSelectedCaseId(tcId);
    const existing = runnerExecutionsMap.get(tcId);
    setActualResultInput(existing?.actualResult || '');
    setExecutionNotesInput(existing?.executionNotes || '');
  };

  // Filtered runs list
  const filteredRuns = useMemo(() => {
    return testRuns.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.buildVersion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' ? true : r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [testRuns, searchTerm, statusFilter]);

  // Open Create Run Modal
  const openCreateRunModal = () => {
    setRunName(`Regression Run - ${new Date().toLocaleDateString()}`);
    setRunEnv(activeProject?.environment || 'QA');
    setBuildVersion(`v1.${Math.floor(Date.now() / 100000) % 100}.0`);
    setRunDescription('');
    setSelectedCaseIdsForRun(testCases.map((c) => c.id)); // select all by default
    setCaseFilterSuite('All');
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleSaveRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const errors: Record<string, string> = {};
    if (!runName || runName.trim().length < 3) {
      errors.name = 'Run name is required (minimum 3 characters).';
    }
    if (!buildVersion || !buildVersion.trim()) {
      errors.buildVersion = 'Build or release version is required.';
    }
    if (selectedCaseIdsForRun.length === 0) {
      errors.cases = 'Select at least one test case for this run.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const newRun = await createTestRun({
        projectId: activeProject.id,
        name: runName.trim(),
        environment: runEnv,
        buildVersion: buildVersion.trim(),
        description: runDescription.trim() || undefined,
        testCaseIds: selectedCaseIdsForRun,
        status: 'Planned',
        createdBy: 'QA Engineer',
      });

      setIsCreateModalOpen(false);
      if (onCloseInitialCreateModal) onCloseInitialCreateModal();

      // Open runner for newly created run
      setActiveRunnerRunId(newRun.id);
      setRunnerSelectedCaseId(newRun.testCaseIds[0] || null);
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Error creating test run.' });
    }
  };

  // Record result in active runner
  const handleRecordResult = async (result: ExecutionResult) => {
    if (!activeRunnerRun || !currentRunnerTestCase) return;

    const existing = runnerExecutionsMap.get(currentRunnerTestCase.id);

    await recordExecution({
      id: existing?.id,
      runId: activeRunnerRun.id,
      testCaseId: currentRunnerTestCase.id,
      result,
      actualResult: actualResultInput.trim() || undefined,
      executionNotes: executionNotesInput.trim() || undefined,
      executedBy: 'QA Tester',
      executedAt: new Date().toISOString(),
      linkedDefectIds: existing?.linkedDefectIds || [],
    });

    // Auto-advance to next case in run if available
    const currentIndex = runnerTestCases.findIndex((tc) => tc.id === currentRunnerTestCase.id);
    if (currentIndex >= 0 && currentIndex < runnerTestCases.length - 1) {
      const nextCase = runnerTestCases[currentIndex + 1];
      onSelectRunnerCase(nextCase.id);
    }
  };

  // Complete Run Click
  const handleCompleteRunClick = async () => {
    if (!activeRunnerRun) return;

    const summary = calculateRunSummary(
      activeRunnerRun.testCaseIds,
      Array.from(runnerExecutionsMap.values())
    );

    if (summary.notRun > 0) {
      // Incomplete execution requires explicit confirmation
      setIsConfirmIncompleteDialogOpen(true);
    } else {
      await finalizeRunCompletion();
    }
  };

  const finalizeRunCompletion = async () => {
    if (!activeRunnerRun) return;
    await updateTestRun(activeRunnerRun.id, {
      status: 'Completed',
      completionTime: new Date().toISOString(),
    });
    setIsConfirmIncompleteDialogOpen(false);
  };

  // Export current run executions to CSV
  const handleExportRunExecutions = (run: TestRun) => {
    const runExecs = executions.filter((e) => e.runId === run.id);
    const enriched = run.testCaseIds.map((tcId) => {
      const tc = testCases.find((c) => c.id === tcId);
      const ex = runExecs.find((e) => e.testCaseId === tcId);
      return {
        id: ex?.id || `pending-${tcId}`,
        runId: run.id,
        testCaseId: tcId,
        testCaseTitle: tc?.title || '',
        module: tc?.module || '',
        result: (ex?.result || 'Not Run') as ExecutionResult,
        actualResult: ex?.actualResult,
        executionNotes: ex?.executionNotes,
        executedBy: ex?.executedBy,
        executedAt: ex?.executedAt,
        linkedDefectIds: ex?.linkedDefectIds,
      };
    });

    exportExecutionsToCsv(run.name, enriched, `${run.id}-executions.csv`);
  };

  // Open Log Defect with Prefilled Data
  const handleOpenDefectFromFailedExecution = () => {
    if (!activeRunnerRun || !currentRunnerTestCase || !onOpenDefectForExecution) return;

    const exec = runnerExecutionsMap.get(currentRunnerTestCase.id);

    const stepsText = currentRunnerTestCase.steps
      .map((s) => `${s.stepNumber}. ${s.action}\n   Expected: ${s.expectedResult}`)
      .join('\n');

    onOpenDefectForExecution({
      title: `[${currentRunnerTestCase.id}] ${currentRunnerTestCase.title}`,
      projectId: activeRunnerRun.projectId,
      linkedTestCaseId: currentRunnerTestCase.id,
      linkedTestRunId: activeRunnerRun.id,
      linkedExecutionId: exec?.id || `exec-${Date.now()}`,
      actualResult:
        actualResultInput || exec?.actualResult || 'Observed failure during step execution.',
      expectedResult: currentRunnerTestCase.expectedResult,
      stepsToReproduce: stepsText,
      environment: activeRunnerRun.environment,
      buildVersion: activeRunnerRun.buildVersion,
    });
  };

  return (
    <div className="space-y-6">
      {/* If Runner is Open, show the Test Execution Runner View */}
      {activeRunnerRun ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs animate-in fade-in duration-150">
          {/* Runner Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setActiveRunnerRunId(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition-colors"
                  title="Back to Test Runs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                  {activeRunnerRun.id}
                </span>
                <StatusBadge status={activeRunnerRun.status} />
                <span className="text-xs text-slate-500 font-mono">
                  {activeRunnerRun.environment} · {activeRunnerRun.buildVersion}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{activeRunnerRun.name}</h2>
            </div>

            {/* Runner Summary Stats Strip */}
            {(() => {
              const summary = calculateRunSummary(
                activeRunnerRun.testCaseIds,
                Array.from(runnerExecutionsMap.values())
              );

              return (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-800">
                      Progress: {summary.completed} / {summary.total} ({summary.completionPercentage}%)
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Pass Rate: {summary.passRate !== null ? `${summary.passRate}%` : 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportRunExecutions(activeRunnerRun)}
                      className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      title="Export run results to CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {activeRunnerRun.status !== 'Completed' ? (
                      <button
                        onClick={handleCompleteRunClick}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Run</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          updateTestRun(activeRunnerRun.id, { status: 'In Progress' })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Reopen Run
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Runner Body: Split Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
            {/* Left Column: Test Cases Checklist in Run */}
            <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/40 p-3 space-y-1.5 overflow-y-auto max-h-[680px]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Cases ({runnerTestCases.length})</span>
                <span className="text-[10px]">Select to review</span>
              </div>

              {runnerTestCases.map((tc, index) => {
                const exec = runnerExecutionsMap.get(tc.id);
                const isSelected = currentRunnerTestCase?.id === tc.id;
                const result = exec?.result || 'Not Run';

                return (
                  <button
                    key={tc.id}
                    onClick={() => onSelectRunnerCase(tc.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-white border-[#3767D5] shadow-xs'
                        : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {tc.id}
                      </span>
                      <ResultBadge result={result} />
                    </div>

                    <div className="mt-1 font-semibold text-xs text-slate-900 line-clamp-1">
                      {tc.title}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{tc.module}</span>
                      <span className="font-mono text-[10px]">{tc.steps.length} steps</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Execution Form & Case Steps */}
            <div className="md:col-span-8 p-6 flex flex-col justify-between overflow-y-auto max-h-[680px]">
              {currentRunnerTestCase ? (
                <div className="space-y-5">
                  {/* Test Case Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#3767D5] bg-blue-100 px-2 py-0.5 rounded">
                        {currentRunnerTestCase.id}
                      </span>
                      <PriorityBadge priority={currentRunnerTestCase.priority} />
                      <span className="text-xs text-slate-500 font-medium">
                        {currentRunnerTestCase.module}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {currentRunnerTestCase.title}
                    </h3>
                  </div>

                  {/* Preconditions & Test Data */}
                  {(currentRunnerTestCase.preconditions || currentRunnerTestCase.testData) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {currentRunnerTestCase.preconditions && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">
                            Preconditions
                          </span>
                          <p className="mt-0.5 text-slate-700 font-mono text-[11px]">
                            {currentRunnerTestCase.preconditions}
                          </p>
                        </div>
                      )}
                      {currentRunnerTestCase.testData && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">
                            Test Data
                          </span>
                          <p className="mt-0.5 text-slate-700 font-mono text-[11px]">
                            {currentRunnerTestCase.testData}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test Steps Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Test Steps Execution
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-500 font-semibold">
                            <th className="p-2.5 w-12 text-center">#</th>
                            <th className="p-2.5 w-1/2">Step Action</th>
                            <th className="p-2.5 w-1/2">Expected Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentRunnerTestCase.steps.map((step) => (
                            <tr key={step.stepNumber} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-center text-slate-400 font-bold">
                                {step.stepNumber}
                              </td>
                              <td className="p-2.5 text-slate-800 leading-relaxed font-medium">
                                {step.action}
                              </td>
                              <td className="p-2.5 text-slate-600 leading-relaxed">
                                {step.expectedResult || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Final Expected Result */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">
                      Final Acceptance Criteria
                    </span>
                    <p className="mt-0.5 text-emerald-950 font-medium">
                      {currentRunnerTestCase.expectedResult}
                    </p>
                  </div>

                  {/* Execution Inputs: Actual Result & Notes */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Actual Result
                      </label>
                      <textarea
                        value={actualResultInput}
                        onChange={(e) => setActualResultInput(e.target.value)}
                        rows={2}
                        placeholder="What actually occurred during manual execution? (e.g. Payment succeeded in 1.2s; Order # generated)"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Execution Notes & Environment Telemetry
                      </label>
                      <input
                        type="text"
                        value={executionNotesInput}
                        onChange={(e) => setExecutionNotesInput(e.target.value)}
                        placeholder="e.g. Chrome 124 on macOS, tested on staging backend"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                      />
                    </div>
                  </div>

                  {/* Linked Defect button if execution was marked Failed */}
                  {(() => {
                    const currentExec = runnerExecutionsMap.get(currentRunnerTestCase.id);
                    if (currentExec?.result === 'Failed') {
                      return (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                          <div className="text-xs text-rose-800 font-medium flex items-center gap-2">
                            <Bug className="w-4 h-4 text-rose-600" />
                            <span>This test case is marked Failed.</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenDefectFromFailedExecution}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#C43F50] hover:bg-[#A93343] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Bug className="w-3.5 h-3.5" />
                            <span>Log Linked Defect</span>
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Result Action Buttons Bar */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
                    <span className="text-xs text-slate-500">Record Test Result:</span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleRecordResult('Passed')}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#16845B] hover:bg-[#126b4a] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pass</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRecordResult('Failed')}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#C43F50] hover:bg-[#A93343] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Fail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRecordResult('Blocked')}
                        className="px-3 py-2 text-xs font-semibold text-[#B7791F] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        <span>Block</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRecordResult('Not Run')}
                        className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Reset to Not Run
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Select a test case from the list on the left to start executing.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Runs List View (When runner is closed) */}
      {!activeRunnerRun && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Test Runs & Executions
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Execute manual test suites against releases, record verdicts, and log defect traces.
              </p>
            </div>
            <button
              onClick={openCreateRunModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Test Run</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search test runs by name, ID, or build..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              {(['All', 'Planned', 'In Progress', 'Completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 font-medium rounded-md transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Test Runs Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRuns.map((run) => {
              const runExecs = executions.filter((e) => e.runId === run.id);
              const summary = calculateRunSummary(run.testCaseIds, runExecs);

              return (
                <div
                  key={run.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 flex flex-col justify-between transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {run.id}
                        </span>
                        <StatusBadge status={run.status} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportRunExecutions(run)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                          title="Export CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRunToDelete(run)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          title="Delete Run"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1">
                      {run.name}
                    </h3>

                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Env: <strong className="text-slate-800">{run.environment}</strong></span>
                      <span>·</span>
                      <span className="font-mono">Build: {run.buildVersion}</span>
                      <span>·</span>
                      <span>{run.testCaseIds.length} test cases</span>
                    </div>

                    {run.description && (
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {run.description}
                      </p>
                    )}

                    {/* Progress Breakdown */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          Execution Progress: {summary.completionPercentage}%
                        </span>
                        <span className="font-mono text-slate-700">
                          Pass Rate: <strong>{summary.passRate !== null ? `${summary.passRate}%` : 'N/A'}</strong>
                        </span>
                      </div>

                      {/* Stacked bar */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        {summary.total > 0 ? (
                          <>
                            <div
                              style={{ width: `${(summary.passed / summary.total) * 100}%` }}
                              className="bg-[#16845B]"
                              title={`Passed: ${summary.passed}`}
                            />
                            <div
                              style={{ width: `${(summary.failed / summary.total) * 100}%` }}
                              className="bg-[#C43F50]"
                              title={`Failed: ${summary.failed}`}
                            />
                            <div
                              style={{ width: `${(summary.blocked / summary.total) * 100}%` }}
                              className="bg-[#B7791F]"
                              title={`Blocked: ${summary.blocked}`}
                            />
                            <div
                              style={{ width: `${(summary.notRun / summary.total) * 100}%` }}
                              className="bg-[#718096]"
                              title={`Not Run: ${summary.notRun}`}
                            />
                          </>
                        ) : (
                          <div className="w-full h-full bg-slate-200" />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span className="text-[#16845B] font-semibold">P: {summary.passed}</span>
                        <span className="text-[#C43F50] font-semibold">F: {summary.failed}</span>
                        <span className="text-[#B7791F] font-semibold">B: {summary.blocked}</span>
                        <span className="text-[#718096]">NR: {summary.notRun}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Created by {run.createdBy}
                    </span>

                    <button
                      onClick={() => {
                        setActiveRunnerRunId(run.id);
                        setRunnerSelectedCaseId(run.testCaseIds[0] || null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Execute Run</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRuns.length === 0 && (
            <EmptyState
              icon={PlayCircle}
              title="No test runs scheduled"
              description="A test run collects selected test cases to execute against a build."
              actionLabel="New Test Run"
              onAction={openCreateRunModal}
            />
          )}
        </>
      )}

      {/* Create Test Run Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Test Run</h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  if (onCloseInitialCreateModal) onCloseInitialCreateModal();
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRun} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {formErrors.submit && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Run Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="e.g. Sprint 42 Regression Suite - Release v2.4.0"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Environment
                  </label>
                  <select
                    value={runEnv}
                    onChange={(e) => setRunEnv(e.target.value as Environment)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="Development">Development</option>
                    <option value="QA">QA</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Build / Version <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={buildVersion}
                    onChange={(e) => setBuildVersion(e.target.value)}
                    placeholder="e.g. build-2026.10.24-rc2"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                  {formErrors.buildVersion && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.buildVersion}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Testing Objective
                </label>
                <textarea
                  value={runDescription}
                  onChange={(e) => setRunDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Verify checkout, payments, and discounts before Friday release"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              {/* Case Selection Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Select Test Cases ({selectedCaseIdsForRun.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCaseIdsForRun(testCases.map((c) => c.id))}
                      className="text-xs text-[#3767D5] font-semibold hover:underline"
                    >
                      Select All
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseIdsForRun([])}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {formErrors.cases && (
                  <p className="text-[11px] text-rose-600 mb-2">{formErrors.cases}</p>
                )}

                {/* Filter cases by suite */}
                <div className="mb-2">
                  <select
                    value={caseFilterSuite}
                    onChange={(e) => setCaseFilterSuite(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="All">Show Cases From All Suites</option>
                    {testSuites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/50">
                  {testCases
                    .filter((tc) =>
                      caseFilterSuite === 'All' ? true : tc.suiteId === caseFilterSuite
                    )
                    .map((tc) => {
                      const isChecked = selectedCaseIdsForRun.includes(tc.id);
                      return (
                        <label
                          key={tc.id}
                          className="flex items-center gap-3 p-2.5 hover:bg-white cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedCaseIdsForRun((prev) =>
                                prev.includes(tc.id)
                                  ? prev.filter((id) => id !== tc.id)
                                  : [...prev, tc.id]
                              );
                            }}
                            className="rounded border-slate-300 text-[#3767D5] focus:ring-[#3767D5]"
                          />
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {tc.id}
                          </span>
                          <span className="text-xs text-slate-800 line-clamp-1 flex-1 font-medium">
                            {tc.title}
                          </span>
                          <PriorityBadge priority={tc.priority} />
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    if (onCloseInitialCreateModal) onCloseInitialCreateModal();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
                >
                  Create & Launch Runner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incomplete Execution Warning Dialog */}
      <ConfirmDialog
        isOpen={isConfirmIncompleteDialogOpen}
        title="Complete Incomplete Test Run?"
        message={`This test run contains test cases that are still 'Not Run'.

Per QA guidelines, marking this run 'Completed' will record partial completion in metrics and reports. Are you sure you want to finalize this run with incomplete cases?`}
        confirmLabel="Yes, Mark Completed"
        cancelLabel="Continue Executing"
        isDestructive={false}
        onConfirm={finalizeRunCompletion}
        onCancel={() => setIsConfirmIncompleteDialogOpen(false)}
      />

      {/* Delete Test Run Dialog */}
      <ConfirmDialog
        isOpen={!!runToDelete}
        title="Delete Test Run?"
        message={`Are you sure you want to delete test run ${runToDelete?.id}: "${runToDelete?.name}"?

All execution logs associated with this run will be deleted.`}
        confirmLabel="Delete Test Run"
        onConfirm={async () => {
          if (runToDelete) {
            await deleteTestRun(runToDelete.id);
            setRunToDelete(null);
          }
        }}
        onCancel={() => setRunToDelete(null)}
      />
    </div>
  );
};
