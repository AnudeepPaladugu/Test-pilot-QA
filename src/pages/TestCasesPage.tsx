/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import { TestCase, TestStep, Priority, TestType, TestCaseStatus } from '../types/qa';
import { exportTestCasesToCsv } from '../utils/csvExport';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import {
  ListChecks,
  Plus,
  Search,
  Download,
  Copy,
  Trash2,
  Edit2,
  Eye,
  Filter,
  X,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface TestCasesPageProps {
  initialCreateModalOpen?: boolean;
  onCloseInitialCreateModal?: () => void;
}

export const TestCasesPage: React.FC<TestCasesPageProps> = ({
  initialCreateModalOpen = false,
  onCloseInitialCreateModal,
}) => {
  const {
    activeProject,
    testCases,
    testSuites,
    createTestCase,
    updateTestCase,
    duplicateTestCase,
    deleteTestCase,
    bulkDeleteTestCases,
    bulkAssignSuite,
  } = useStorage();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedModule, setSelectedModule] = useState<string>('All');

  // Sorting
  const [sortBy, setSortBy] = useState<'id' | 'title' | 'priority' | 'updatedAt'>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Selection
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // Modals & Details
  const [isEditModalOpen, setIsEditModalOpen] = useState(initialCreateModalOpen);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [viewingCase, setViewingCase] = useState<TestCase | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<TestCase | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkSuiteOpen, setIsBulkSuiteOpen] = useState(false);
  const [targetBulkSuiteId, setTargetBulkSuiteId] = useState<string>('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [suiteId, setSuiteId] = useState<string>('');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [testData, setTestData] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [type, setType] = useState<TestType>('Functional');
  const [status, setStatus] = useState<TestCaseStatus>('Ready');
  const [tagsInput, setTagsInput] = useState('');
  const [steps, setSteps] = useState<TestStep[]>([
    { stepNumber: 1, action: '', expectedResult: '' },
  ]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Unique modules in project
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    testCases.forEach((tc) => {
      if (tc.module) set.add(tc.module);
    });
    return Array.from(set).sort();
  }, [testCases]);

  // Filtered & Sorted Cases
  const filteredCases = useMemo(() => {
    let result = testCases.filter((tc) => {
      const matchesSearch =
        tc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tc.module && tc.module.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSuite =
        selectedSuiteId === 'All'
          ? true
          : selectedSuiteId === 'Unassigned'
          ? !tc.suiteId
          : tc.suiteId === selectedSuiteId;

      const matchesPriority =
        selectedPriority === 'All' ? true : tc.priority === selectedPriority;

      const matchesType = selectedType === 'All' ? true : tc.type === selectedType;

      const matchesStatus =
        selectedStatus === 'All' ? true : tc.status === selectedStatus;

      const matchesModule =
        selectedModule === 'All' ? true : tc.module === selectedModule;

      return (
        matchesSearch &&
        matchesSuite &&
        matchesPriority &&
        matchesType &&
        matchesStatus &&
        matchesModule
      );
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'id') {
        comparison = a.id.localeCompare(b.id, undefined, { numeric: true });
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'priority') {
        const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        comparison = (order[b.priority] || 0) - (order[a.priority] || 0);
      } else if (sortBy === 'updatedAt') {
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [
    testCases,
    searchTerm,
    selectedSuiteId,
    selectedPriority,
    selectedType,
    selectedStatus,
    selectedModule,
    sortBy,
    sortAsc,
  ]);

  const toggleSort = (field: 'id' | 'title' | 'priority' | 'updatedAt') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCaseIds(filteredCases.map((c) => c.id));
    } else {
      setSelectedCaseIds([]);
    }
  };

  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedSuiteId('All');
    setSelectedPriority('All');
    setSelectedType('All');
    setSelectedStatus('All');
    setSelectedModule('All');
  };

  // Step builder helpers
  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, action: '', expectedResult: '' },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    const updated = steps
      .filter((_, i) => i !== index)
      .map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
    setSteps(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const copy = [...steps];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
    setSteps(reordered);
  };

  const handleStepChange = (
    index: number,
    field: 'action' | 'expectedResult',
    value: string
  ) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const openCreateModal = () => {
    setEditingCase(null);
    setTitle('');
    setSuiteId(testSuites[0]?.id || '');
    setModuleName('General');
    setDescription('');
    setPreconditions('');
    setTestData('');
    setExpectedResult('');
    setPriority('Medium');
    setType('Functional');
    setStatus('Ready');
    setTagsInput('');
    setSteps([{ stepNumber: 1, action: '', expectedResult: '' }]);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openEditModal = (tc: TestCase) => {
    setEditingCase(tc);
    setTitle(tc.title);
    setSuiteId(tc.suiteId || '');
    setModuleName(tc.module || 'General');
    setDescription(tc.description || '');
    setPreconditions(tc.preconditions || '');
    setTestData(tc.testData || '');
    setExpectedResult(tc.expectedResult || '');
    setPriority(tc.priority);
    setType(tc.type);
    setStatus(tc.status);
    setTagsInput(tc.tags.join(', '));
    setSteps(
      tc.steps.length > 0
        ? tc.steps.map((s) => ({ ...s }))
        : [{ stepNumber: 1, action: '', expectedResult: '' }]
    );
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleSaveTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const errors: Record<string, string> = {};
    if (!title || title.trim().length < 5 || title.trim().length > 200) {
      errors.title = 'Title is required and must be between 5 and 200 characters.';
    }
    if (!moduleName || !moduleName.trim()) {
      errors.module = 'Module name is required.';
    }

    // Validate steps
    const validSteps = steps.filter((s) => s.action.trim() !== '');
    if (validSteps.length === 0) {
      errors.steps = 'At least one step with an action is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const reindexedSteps = validSteps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));

    try {
      if (editingCase) {
        await updateTestCase(editingCase.id, {
          title: title.trim(),
          suiteId: suiteId || undefined,
          module: moduleName.trim(),
          description: description.trim() || undefined,
          preconditions: preconditions.trim() || undefined,
          testData: testData.trim() || undefined,
          expectedResult: expectedResult.trim(),
          priority,
          type,
          status,
          tags,
          steps: reindexedSteps,
        });
      } else {
        await createTestCase({
          projectId: activeProject.id,
          suiteId: suiteId || undefined,
          title: title.trim(),
          module: moduleName.trim(),
          description: description.trim() || undefined,
          preconditions: preconditions.trim() || undefined,
          testData: testData.trim() || undefined,
          expectedResult: expectedResult.trim(),
          priority,
          type,
          method: 'Manual',
          status,
          tags,
          steps: reindexedSteps,
          createdBy: 'QA Engineer',
        });
      }
      setIsEditModalOpen(false);
      if (onCloseInitialCreateModal) onCloseInitialCreateModal();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Error saving test case.' });
    }
  };

  const handleExportCsv = () => {
    const listToExport =
      selectedCaseIds.length > 0
        ? testCases.filter((c) => selectedCaseIds.includes(c.id))
        : filteredCases;

    exportTestCasesToCsv(
      listToExport,
      `${activeProject?.key || 'QA'}-test-cases-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Test Cases</h2>
          <p className="text-xs text-slate-500 mt-1">
            Design, document, organize, and maintain repeatable manual test cases for {activeProject?.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Test Case</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, title, or module..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Suite Filter */}
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Suites</option>
              <option value="Unassigned">Unassigned</option>
              {testSuites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Types</option>
              <option value="Functional">Functional</option>
              <option value="UI">UI</option>
              <option value="Regression">Regression</option>
              <option value="Smoke">Smoke</option>
              <option value="Negative">Negative</option>
              <option value="Validation">Validation</option>
              <option value="Security">Security</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready</option>
              <option value="Draft">Draft</option>
              <option value="Deprecated">Deprecated</option>
            </select>

            {/* Clear filters button */}
            {(searchTerm ||
              selectedSuiteId !== 'All' ||
              selectedPriority !== 'All' ||
              selectedType !== 'All' ||
              selectedStatus !== 'All' ||
              selectedModule !== 'All') && (
              <button
                onClick={clearAllFilters}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 hover:underline"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Items Batch Actions Bar */}
        {selectedCaseIds.length > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#3767D5]">
                {selectedCaseIds.length} test cases selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkSuiteOpen(true)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors text-slate-700"
              >
                Assign Suite
              </button>
              <button
                onClick={handleExportCsv}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors text-slate-700"
              >
                Export Selected
              </button>
              <button
                onClick={() => setIsBulkDeleteOpen(true)}
                className="px-2.5 py-1 bg-rose-50 border border-rose-200 rounded text-rose-700 hover:bg-rose-100 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredCases.length > 0 &&
                      selectedCaseIds.length === filteredCases.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-[#3767D5] focus:ring-[#3767D5]"
                  />
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900 transition-colors w-28"
                  onClick={() => toggleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => toggleSort('title')}
                >
                  <div className="flex items-center gap-1">
                    <span>Title</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">Suite / Module</th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900 transition-colors w-24"
                  onClick={() => toggleSort('priority')}
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 w-28">Type</th>
                <th className="p-3 w-24">Status</th>
                <th className="p-3 w-20 text-center">Steps</th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900 transition-colors w-28"
                  onClick={() => toggleSort('updatedAt')}
                >
                  <div className="flex items-center gap-1">
                    <span>Updated</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((tc) => {
                const isSelected = selectedCaseIds.includes(tc.id);
                const suite = testSuites.find((s) => s.id === tc.suiteId);

                return (
                  <tr
                    key={tc.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCase(tc.id)}
                        className="rounded border-slate-300 text-[#3767D5] focus:ring-[#3767D5]"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {tc.id}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setViewingCase(tc)}
                        className="text-left font-semibold text-slate-900 hover:text-[#3767D5] transition-colors line-clamp-1"
                      >
                        {tc.title}
                      </button>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">
                        {suite ? suite.name : 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-slate-400">{tc.module}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <PriorityBadge priority={tc.priority} />
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-600">{tc.type}</td>
                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge status={tc.status} />
                    </td>
                    <td className="p-3 text-center font-mono tabular-nums text-slate-600">
                      {tc.steps.length}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(tc.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingCase(tc)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(tc)}
                          className="p-1.5 text-slate-400 hover:text-[#3767D5] rounded-md hover:bg-slate-100"
                          title="Edit Case"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateTestCase(tc.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                          title="Duplicate Case"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCaseToDelete(tc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          title="Delete Case"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCases.length === 0 && (
          <EmptyState
            icon={ListChecks}
            title="No test cases found"
            description="Create your first test case or adjust your current filter criteria."
            actionLabel="New Test Case"
            onAction={openCreateModal}
          />
        )}
      </div>

      {/* View Test Case Details Modal */}
      {viewingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#3767D5]">
                    {viewingCase.id}
                  </span>
                  <PriorityBadge priority={viewingCase.priority} />
                  <StatusBadge status={viewingCase.status} />
                  <span className="text-xs text-slate-500 font-medium">
                    {viewingCase.type}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {viewingCase.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingCase(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs text-slate-700">
              {/* Module & Suite info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Suite
                  </span>
                  <div className="font-medium text-slate-800">
                    {testSuites.find((s) => s.id === viewingCase.suiteId)?.name || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Module / Feature
                  </span>
                  <div className="font-medium text-slate-800">{viewingCase.module}</div>
                </div>
              </div>

              {viewingCase.description && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Description</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">
                    {viewingCase.description}
                  </p>
                </div>
              )}

              {viewingCase.preconditions && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Preconditions</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg font-mono text-[11px]">
                    {viewingCase.preconditions}
                  </p>
                </div>
              )}

              {viewingCase.testData && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Test Data</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg font-mono text-[11px]">
                    {viewingCase.testData}
                  </p>
                </div>
              )}

              {/* Step by step table */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">
                  Test Steps ({viewingCase.steps.length})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5 w-1/2">Action / Input</th>
                        <th className="p-2.5 w-1/2">Expected Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingCase.steps.map((s) => (
                        <tr key={s.stepNumber} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-center text-slate-400 font-bold">
                            {s.stepNumber}
                          </td>
                          <td className="p-2.5 text-slate-800 leading-relaxed">{s.action}</td>
                          <td className="p-2.5 text-slate-600 leading-relaxed">
                            {s.expectedResult || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Final Expected Result</h4>
                <p className="text-slate-700 bg-emerald-50/60 border border-emerald-100 p-3 rounded-lg leading-relaxed">
                  {viewingCase.expectedResult}
                </p>
              </div>

              {viewingCase.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">Tags:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {viewingCase.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created by {viewingCase.createdBy} · {new Date(viewingCase.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setViewingCase(null);
                    openEditModal(viewingCase);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewingCase(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Test Case Modal with Step Builder */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCase ? `Edit Test Case (${editingCase.id})` : 'Create New Test Case'}
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  if (onCloseInitialCreateModal) onCloseInitialCreateModal();
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTestCase}
              className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
            >
              {formErrors.submit && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Test Case Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Verify 3D Secure checkout with valid test Visa card"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Suite & Module */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Suite
                  </label>
                  <select
                    value={suiteId}
                    onChange={(e) => setSuiteId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="">(Unassigned)</option>
                    {testSuites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Module / Feature <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g. Checkout, Auth, Catalog"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                  {formErrors.module && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.module}</p>
                  )}
                </div>
              </div>

              {/* Priority, Type, Status */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
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
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TestType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="Functional">Functional</option>
                    <option value="UI">UI</option>
                    <option value="Regression">Regression</option>
                    <option value="Smoke">Smoke</option>
                    <option value="Sanity">Sanity</option>
                    <option value="Integration">Integration</option>
                    <option value="Negative">Negative</option>
                    <option value="Validation">Validation</option>
                    <option value="Compatibility">Compatibility</option>
                    <option value="Accessibility">Accessibility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TestCaseStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="Ready">Ready</option>
                    <option value="Draft">Draft</option>
                    <option value="Deprecated">Deprecated</option>
                  </select>
                </div>
              </div>

              {/* Preconditions & Test Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preconditions
                  </label>
                  <textarea
                    value={preconditions}
                    onChange={(e) => setPreconditions(e.target.value)}
                    rows={2}
                    placeholder="e.g. User is logged in, cart has 1 product..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Data
                  </label>
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    rows={2}
                    placeholder="e.g. Card 4000 0000 0000 0002, OTP 123456..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                </div>
              </div>

              {/* Dynamic Steps Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Test Steps <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-xs font-semibold text-[#3767D5] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                {formErrors.steps && (
                  <p className="text-[11px] text-rose-600 mb-2">{formErrors.steps}</p>
                )}

                <div className="space-y-2.5">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          Step {step.stepNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 'down')}
                            disabled={idx === steps.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          {steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Delete Step"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            value={step.action}
                            onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                            placeholder="Action: e.g. Click 'Proceed to Checkout'"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-hidden focus:border-[#3767D5]"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={step.expectedResult}
                            onChange={(e) =>
                              handleStepChange(idx, 'expectedResult', e.target.value)
                            }
                            placeholder="Expected: e.g. Payment modal renders"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-hidden focus:border-[#3767D5]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Expected Result */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Expected Result
                </label>
                <textarea
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  rows={2}
                  placeholder="e.g. Order is processed successfully and receipt email is dispatched."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. Checkout, Smoke, P1, Stripe"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
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
                  {editingCase ? 'Update Test Case' : 'Create Test Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Case Dialog */}
      <ConfirmDialog
        isOpen={!!caseToDelete}
        title="Delete Test Case?"
        message={`Are you sure you want to delete test case ${caseToDelete?.id}: "${caseToDelete?.title}"?

This will remove this case from future test runs.`}
        confirmLabel="Delete Test Case"
        onConfirm={async () => {
          if (caseToDelete) {
            await deleteTestCase(caseToDelete.id);
            setCaseToDelete(null);
          }
        }}
        onCancel={() => setCaseToDelete(null)}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        title="Delete Selected Test Cases?"
        message={`Are you sure you want to delete ${selectedCaseIds.length} test cases permanently?`}
        confirmLabel="Delete All Selected"
        onConfirm={async () => {
          await bulkDeleteTestCases(selectedCaseIds);
          setSelectedCaseIds([]);
          setIsBulkDeleteOpen(false);
        }}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />

      {/* Bulk Assign Suite Modal */}
      {isBulkSuiteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-2">Assign Suite</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select a target suite for the {selectedCaseIds.length} chosen test cases:
            </p>
            <select
              value={targetBulkSuiteId}
              onChange={(e) => setTargetBulkSuiteId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white mb-5"
            >
              <option value="">(Unassign from Suites)</option>
              {testSuites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkSuiteOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await bulkAssignSuite(selectedCaseIds, targetBulkSuiteId || undefined);
                  setIsBulkSuiteOpen(false);
                  setSelectedCaseIds([]);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg shadow-xs"
              >
                Apply Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
