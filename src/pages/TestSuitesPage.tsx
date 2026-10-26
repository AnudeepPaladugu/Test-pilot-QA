/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import { TestSuite } from '../types/qa';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import {
  Layers,
  Plus,
  Search,
  Trash2,
  Edit2,
  ListChecks,
  X,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../components/layout/Sidebar';

interface TestSuitesPageProps {
  onNavigateToCasesWithSuite?: (suiteId: string) => void;
}

export const TestSuitesPage: React.FC<TestSuitesPageProps> = ({
  onNavigateToCasesWithSuite,
}) => {
  const {
    activeProject,
    testSuites,
    testCases,
    createSuite,
    updateSuite,
    deleteSuite,
  } = useStorage();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Safe delete dialog
  const [suiteToDelete, setSuiteToDelete] = useState<TestSuite | null>(null);

  // Map case counts by suite
  const suiteCaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of testCases) {
      if (c.suiteId) {
        counts[c.suiteId] = (counts[c.suiteId] || 0) + 1;
      }
    }
    return counts;
  }, [testCases]);

  const filteredSuites = useMemo(() => {
    return testSuites.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.module && s.module.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [testSuites, searchTerm]);

  const openCreateModal = () => {
    setEditingSuite(null);
    setName('');
    setDescription('');
    setModuleName('');
    setTagsInput('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (s: TestSuite) => {
    setEditingSuite(s);
    setName(s.name);
    setDescription(s.description || '');
    setModuleName(s.module || '');
    setTagsInput(s.tags.join(', '));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const errors: Record<string, string> = {};
    if (!name || name.trim().length < 2) {
      errors.name = 'Suite name is required (minimum 2 characters).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      if (editingSuite) {
        await updateSuite(editingSuite.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          module: moduleName.trim() || undefined,
          tags,
          projectId: activeProject.id,
        });
      } else {
        await createSuite({
          projectId: activeProject.id,
          name: name.trim(),
          description: description.trim() || undefined,
          module: moduleName.trim() || undefined,
          tags,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Error saving test suite.' });
    }
  };

  const handleDeleteSuiteConfirm = async () => {
    if (!suiteToDelete) return;
    // Unassign cases safely so they are never lost
    await deleteSuite(suiteToDelete.id, true);
    setSuiteToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Test Suites</h2>
          <p className="text-xs text-slate-500 mt-1">
            Group related test scenarios by business domain, feature epic, or regression suite.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Suite</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suites by name, module, or tags..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
          />
        </div>
      </div>

      {/* Suites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuites.map((suite) => {
          const caseCount = suiteCaseCounts[suite.id] || 0;

          return (
            <div
              key={suite.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 flex flex-col justify-between transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-[#3767D5]">
                      <Layers className="w-4 h-4" />
                    </span>
                    {suite.module && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {suite.module}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(suite)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                      title="Edit Suite"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSuiteToDelete(suite)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                      title="Delete Suite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1">
                  {suite.name}
                </h3>

                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {suite.description || 'No description provided.'}
                </p>

                {suite.tags.length > 0 && (
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {suite.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <ListChecks className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {caseCount}
                  </span>
                  <span>{caseCount === 1 ? 'test case' : 'test cases'}</span>
                </div>

                {onNavigateToCasesWithSuite && (
                  <button
                    onClick={() => onNavigateToCasesWithSuite(suite.id)}
                    className="text-xs font-semibold text-[#3767D5] hover:underline flex items-center gap-1"
                  >
                    <span>View Cases</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuites.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No test suites found"
          description="Test suites organize your test cases into functional domains or regression sets."
          actionLabel="New Test Suite"
          onAction={openCreateModal}
        />
      )}

      {/* Create / Edit Suite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSuite ? 'Edit Test Suite' : 'Create Test Suite'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formErrors.submit && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Suite Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Checkout & Payments"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Module / Domain
                </label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="e.g. Payments, Authentication, Catalog"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What scope or user journeys does this suite cover?"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. Core, Payments, P1"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
                >
                  {editingSuite ? 'Update Suite' : 'Create Suite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Suite Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!suiteToDelete}
        title="Delete Test Suite?"
        message={`Are you sure you want to delete suite "${suiteToDelete?.name}"?

Deleting this suite will NOT delete its test cases. The ${
          suiteCaseCounts[suiteToDelete?.id || ''] || 0
        } assigned test cases will be safely moved to 'Unassigned' so no test data is lost.`}
        confirmLabel="Unassign Cases & Delete Suite"
        cancelLabel="Keep Suite"
        isDestructive={true}
        onConfirm={handleDeleteSuiteConfirm}
        onCancel={() => setSuiteToDelete(null)}
      />
    </div>
  );
};
