/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import {
  Defect,
  DefectSeverity,
  DefectPriority,
  DefectStatus,
} from '../types/qa';
import { exportDefectsToCsv } from '../utils/csvExport';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import {
  Bug,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  Eye,
  Filter,
  X,
  ArrowUpDown,
  ExternalLink,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface DefectsPageProps {
  prefilledDefectData?: {
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
  } | null;
  onClearPrefilledDefect?: () => void;
}

export const DefectsPage: React.FC<DefectsPageProps> = ({
  prefilledDefectData,
  onClearPrefilledDefect,
}) => {
  const {
    activeProject,
    defects,
    testCases,
    testRuns,
    createDefect,
    updateDefect,
    deleteDefect,
  } = useStorage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  const [isModalOpen, setIsModalOpen] = useState(!!prefilledDefectData);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [viewingDefect, setViewingDefect] = useState<Defect | null>(null);
  const [defectToDelete, setDefectToDelete] = useState<Defect | null>(null);

  // Form Fields
  const [title, setTitle] = useState(prefilledDefectData?.title || '');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState(
    prefilledDefectData?.stepsToReproduce || ''
  );
  const [expectedResult, setExpectedResult] = useState(
    prefilledDefectData?.expectedResult || ''
  );
  const [actualResult, setActualResult] = useState(
    prefilledDefectData?.actualResult || ''
  );
  const [severity, setSeverity] = useState<DefectSeverity>('High');
  const [priority, setPriority] = useState<DefectPriority>('P2');
  const [status, setStatus] = useState<DefectStatus>('Open');
  const [environment, setEnvironment] = useState(
    prefilledDefectData?.environment || activeProject?.environment || 'QA'
  );
  const [buildVersion, setBuildVersion] = useState(
    prefilledDefectData?.buildVersion || 'v1.0.0'
  );
  const [reporter, setReporter] = useState('QA Engineer');
  const [assignee, setAssignee] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [linkedTestCaseId, setLinkedTestCaseId] = useState(
    prefilledDefectData?.linkedTestCaseId || ''
  );
  const [linkedTestRunId, setLinkedTestRunId] = useState(
    prefilledDefectData?.linkedTestRunId || ''
  );
  const [linkedExecutionId, setLinkedExecutionId] = useState(
    prefilledDefectData?.linkedExecutionId || ''
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered defects
  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      const matchesSearch =
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description ? d.description.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
        (d.linkedTestCaseId && d.linkedTestCaseId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        selectedStatus === 'All' ? true : d.status === selectedStatus;

      const matchesSeverity =
        selectedSeverity === 'All' ? true : d.severity === selectedSeverity;

      const matchesPriority =
        selectedPriority === 'All' ? true : d.priority === selectedPriority;

      return matchesSearch && matchesStatus && matchesSeverity && matchesPriority;
    });
  }, [defects, searchTerm, selectedStatus, selectedSeverity, selectedPriority]);

  const openCreateModal = () => {
    setEditingDefect(null);
    setTitle('');
    setDescription('');
    setStepsToReproduce('');
    setExpectedResult('');
    setActualResult('');
    setSeverity('High');
    setPriority('P2');
    setStatus('Open');
    setEnvironment(activeProject?.environment || 'QA');
    setBuildVersion('v1.0.0');
    setReporter('QA Engineer');
    setAssignee('');
    setResolutionNotes('');
    setLinkedTestCaseId('');
    setLinkedTestRunId('');
    setLinkedExecutionId('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (d: Defect) => {
    setEditingDefect(d);
    setTitle(d.title);
    setDescription(d.description || '');
    setStepsToReproduce(d.stepsToReproduce);
    setExpectedResult(d.expectedResult);
    setActualResult(d.actualResult);
    setSeverity(d.severity);
    setPriority(d.priority);
    setStatus(d.status);
    setEnvironment(d.environment);
    setBuildVersion(d.buildVersion);
    setReporter(d.reporter);
    setAssignee(d.assignee || '');
    setResolutionNotes(d.resolutionNotes || '');
    setLinkedTestCaseId(d.linkedTestCaseId || '');
    setLinkedTestRunId(d.linkedTestRunId || '');
    setLinkedExecutionId(d.linkedExecutionId || '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const errors: Record<string, string> = {};
    if (!title || title.trim().length < 5 || title.trim().length > 200) {
      errors.title = 'Title must be between 5 and 200 characters.';
    }
    if (!stepsToReproduce || stepsToReproduce.trim().length < 5) {
      errors.stepsToReproduce = 'Steps to reproduce are required.';
    }
    if (!actualResult || actualResult.trim().length < 2) {
      errors.actualResult = 'Actual result observed is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingDefect) {
        await updateDefect(editingDefect.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          stepsToReproduce: stepsToReproduce.trim(),
          expectedResult: expectedResult.trim(),
          actualResult: actualResult.trim(),
          severity,
          priority,
          status,
          environment,
          buildVersion,
          reporter: reporter.trim(),
          assignee: assignee.trim() || undefined,
          resolutionNotes: resolutionNotes.trim() || undefined,
          linkedTestCaseId: linkedTestCaseId || undefined,
          linkedTestRunId: linkedTestRunId || undefined,
          linkedExecutionId: linkedExecutionId || undefined,
        });
      } else {
        await createDefect({
          projectId: activeProject.id,
          title: title.trim(),
          description: description.trim() || undefined,
          stepsToReproduce: stepsToReproduce.trim(),
          expectedResult: expectedResult.trim(),
          actualResult: actualResult.trim(),
          severity,
          priority,
          status,
          environment,
          buildVersion,
          reporter: reporter.trim() || 'QA Engineer',
          assignee: assignee.trim() || undefined,
          resolutionNotes: resolutionNotes.trim() || undefined,
          linkedTestCaseId: linkedTestCaseId || undefined,
          linkedTestRunId: linkedTestRunId || undefined,
          linkedExecutionId: linkedExecutionId || undefined,
        });
      }

      setIsModalOpen(false);
      if (onClearPrefilledDefect) onClearPrefilledDefect();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Error saving defect.' });
    }
  };

  const handleExportCsv = () => {
    exportDefectsToCsv(
      filteredDefects,
      `${activeProject?.key || 'QA'}-defects-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Defect Tracking</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track software bugs linked directly to failed test executions and regressions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Log Defect</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search defects by ID, title, description, or test case..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Fixed">Fixed</option>
            <option value="Retest">Retest</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>

          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Priority */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="All">All Priorities</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>

          {(searchTerm ||
            selectedStatus !== 'All' ||
            selectedSeverity !== 'All' ||
            selectedPriority !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('All');
                setSelectedSeverity('All');
                setSelectedPriority('All');
              }}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Defects Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="p-3 w-28">Defect ID</th>
                <th className="p-3">Title</th>
                <th className="p-3 w-24">Severity</th>
                <th className="p-3 w-20">Priority</th>
                <th className="p-3 w-28">Status</th>
                <th className="p-3 w-32">Linked Case</th>
                <th className="p-3 w-32">Assignee</th>
                <th className="p-3 w-28">Updated</th>
                <th className="p-3 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDefects.map((defect) => (
                <tr key={defect.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-rose-600 whitespace-nowrap">
                    {defect.id}
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    <button
                      onClick={() => setViewingDefect(defect)}
                      className="text-left hover:text-[#3767D5] transition-colors line-clamp-1"
                    >
                      {defect.title}
                    </button>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <PriorityBadge priority={defect.severity} />
                  </td>
                  <td className="p-3 whitespace-nowrap font-mono font-bold text-slate-700">
                    {defect.priority}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={defect.status} />
                  </td>
                  <td className="p-3 whitespace-nowrap font-mono text-slate-600">
                    {defect.linkedTestCaseId || '—'}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-600">
                    {defect.assignee || 'Unassigned'}
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                    {new Date(defect.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewingDefect(defect)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(defect)}
                        className="p-1.5 text-slate-400 hover:text-[#3767D5] rounded hover:bg-slate-100"
                        title="Edit Defect"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDefectToDelete(defect)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Delete Defect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDefects.length === 0 && (
          <EmptyState
            icon={Bug}
            title="No defects found"
            description="Log defects when bugs occur during manual testing or regression runs."
            actionLabel="Log New Defect"
            onAction={openCreateModal}
          />
        )}
      </div>

      {/* View Defect Details Modal */}
      {viewingDefect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    {viewingDefect.id}
                  </span>
                  <PriorityBadge priority={viewingDefect.severity} />
                  <StatusBadge status={viewingDefect.status} />
                  <span className="font-mono text-xs text-slate-500 font-bold">
                    {viewingDefect.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {viewingDefect.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingDefect(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Environment
                  </span>
                  <div className="font-medium text-slate-800">{viewingDefect.environment}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Build Version
                  </span>
                  <div className="font-mono text-slate-800">{viewingDefect.buildVersion}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Reporter
                  </span>
                  <div className="text-slate-800">{viewingDefect.reporter}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Assignee
                  </span>
                  <div className="text-slate-800 font-semibold">
                    {viewingDefect.assignee || 'Unassigned'}
                  </div>
                </div>
              </div>

              {viewingDefect.linkedTestCaseId && (
                <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">
                      Linked Test Case:
                    </span>
                    <span className="font-mono font-bold text-[#3767D5]">
                      {viewingDefect.linkedTestCaseId}
                    </span>
                    {viewingDefect.linkedTestRunId && (
                      <span className="text-slate-400">
                        (Run: <code className="font-mono text-slate-600">{viewingDefect.linkedTestRunId}</code>)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {viewingDefect.description && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Description</h4>
                  <p className="bg-slate-50 p-3 rounded-lg text-slate-700 leading-relaxed">
                    {viewingDefect.description}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Steps to Reproduce</h4>
                <pre className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {viewingDefect.stepsToReproduce}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="font-semibold text-emerald-800 mb-1">Expected Result</h4>
                  <div className="bg-emerald-50/60 p-3 rounded-lg text-emerald-950 border border-emerald-100">
                    {viewingDefect.expectedResult}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-rose-800 mb-1">Actual Result</h4>
                  <div className="bg-rose-50/60 p-3 rounded-lg text-rose-950 border border-rose-100">
                    {viewingDefect.actualResult}
                  </div>
                </div>
              </div>

              {viewingDefect.resolutionNotes && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Resolution Notes</h4>
                  <p className="bg-amber-50/60 p-3 rounded-lg text-amber-950 border border-amber-200 leading-relaxed">
                    {viewingDefect.resolutionNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created {new Date(viewingDefect.createdAt).toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setViewingDefect(null);
                    openEditModal(viewingDefect);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Edit Defect
                </button>
                <button
                  onClick={() => setViewingDefect(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Defect Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingDefect ? `Edit Defect (${editingDefect.id})` : 'Log New Defect'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onClearPrefilledDefect) onClearPrefilledDefect();
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDefect} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {formErrors.submit && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Defect Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cart total fails to recalculate after removing promo code"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as DefectPriority)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="P1">P1 (Immediate)</option>
                    <option value="P2">P2 (High)</option>
                    <option value="P3">P3 (Medium)</option>
                    <option value="P4">P4 (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DefectStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Retest">Retest</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Linked Test Case
                  </label>
                  <select
                    value={linkedTestCaseId}
                    onChange={(e) => setLinkedTestCaseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="">(None)</option>
                    {testCases.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.id} - {tc.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="e.g. Lead Developer / Marcus Brody"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Steps to Reproduce <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  rows={3}
                  placeholder="1. Go to cart&#10;2. Apply discount code...&#10;3. Click remove"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] font-mono text-[11px]"
                />
                {formErrors.stepsToReproduce && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.stepsToReproduce}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Result
                  </label>
                  <textarea
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    rows={2}
                    placeholder="What should have happened?"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Actual Result <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    rows={2}
                    placeholder="What bug or erroneous state occurred?"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                  {formErrors.actualResult && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.actualResult}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes on fix, root cause analysis, or verification instructions..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    if (onClearPrefilledDefect) onClearPrefilledDefect();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
                >
                  {editingDefect ? 'Update Defect' : 'Log Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Defect Dialog */}
      <ConfirmDialog
        isOpen={!!defectToDelete}
        title="Delete Defect?"
        message={`Are you sure you want to permanently delete defect ${defectToDelete?.id}: "${defectToDelete?.title}"?`}
        confirmLabel="Delete Defect"
        onConfirm={async () => {
          if (defectToDelete) {
            await deleteDefect(defectToDelete.id);
            setDefectToDelete(null);
          }
        }}
        onCancel={() => setDefectToDelete(null)}
      />
    </div>
  );
};
