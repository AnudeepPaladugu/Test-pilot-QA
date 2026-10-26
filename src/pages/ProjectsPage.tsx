/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStorage } from '../context/StorageContext';
import { Project, Environment } from '../types/qa';
import { isValidProjectKey, isValidUrl } from '../utils/qaCalculations';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  FolderKanban,
  Plus,
  Search,
  ExternalLink,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  ListChecks,
  PlayCircle,
  Bug,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const {
    projects,
    activeProject,
    setActiveProjectId,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    testCases,
    testSuites,
    testRuns,
    defects,
  } = useStorage();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Archived'>('Active');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [environment, setEnvironment] = useState<Environment>('QA');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'All' ? true : p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const openCreateModal = () => {
    setEditingProject(null);
    setName('');
    setKey('');
    setDescription('');
    setAppUrl('');
    setEnvironment('QA');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setKey(p.key);
    setDescription(p.description || '');
    setAppUrl(p.appUrl || '');
    setEnvironment(p.environment);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      errors.name = 'Project name must be between 2 and 100 characters.';
    }

    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey || !isValidProjectKey(cleanKey)) {
      errors.key = 'Project key must be 2 to 10 uppercase alphanumeric characters (e.g. SHOP, AUTH, API).';
    }

    if (appUrl && !isValidUrl(appUrl)) {
      errors.appUrl = 'Please provide a valid URL starting with http:// or https://.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: name.trim(),
          key: cleanKey,
          description: description.trim() || undefined,
          appUrl: appUrl.trim() || undefined,
          environment,
        });
      } else {
        await createProject({
          name: name.trim(),
          key: cleanKey,
          description: description.trim() || undefined,
          appUrl: appUrl.trim() || undefined,
          environment,
          status: 'Active',
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Error saving project.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Workspaces</h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize testing environments, repositories, and test case suites.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, key, or description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
          />
        </div>

        {/* Status segmented controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['Active', 'Archived', 'All'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((p) => {
          const isActiveSelected = activeProject?.id === p.id;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-5 flex flex-col justify-between transition-all ${
                isActiveSelected
                  ? 'border-[#3767D5] ring-2 ring-[#3767D5]/10 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-[#3767D5]">
                      {p.key}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      title="Edit project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {p.status === 'Active' ? (
                      <button
                        onClick={() => archiveProject(p.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 rounded-md hover:bg-amber-50 transition-colors"
                        title="Archive project"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => restoreProject(p.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-md hover:bg-emerald-50 transition-colors"
                        title="Restore project"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setProjectToDelete(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-700 rounded-md hover:bg-rose-50 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1">{p.name}</h3>

                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>

                {p.appUrl && (
                  <a
                    href={p.appUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#3767D5] hover:underline"
                  >
                    <span>{p.appUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>Environment: <strong className="text-slate-800">{p.environment}</strong></span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isActiveSelected ? (
                    <div className="w-full py-1.5 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Current Workspace</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveProjectId(p.id)}
                      className="w-full py-1.5 text-center text-xs font-semibold text-[#3767D5] bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors"
                    >
                      Select Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <FolderKanban className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">No projects found</h4>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or create a new project.
          </p>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
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
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ShopSphere E-Commerce"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="e.g. SHOP"
                    maxLength={10}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                  />
                  {formErrors.key && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.key}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as Environment)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5] bg-white"
                  >
                    <option value="Development">Development</option>
                    <option value="QA">QA</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Application URL
                </label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://staging.example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
                />
                {formErrors.appUrl && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.appUrl}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Briefly describe testing objectives, scope, or target architecture..."
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
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Safety Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="Delete Project and Records?"
        message={`Are you sure you want to permanently delete project "${projectToDelete?.name}"?

Deleting this project will permanently remove all associated:
• Test Suites (${testSuites.length})
• Test Cases (${testCases.length})
• Test Runs (${testRuns.length})
• Defects (${defects.length})

This action cannot be undone.`}
        confirmLabel="Permanently Delete Project"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
