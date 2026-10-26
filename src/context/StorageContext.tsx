/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Project,
  TestSuite,
  TestCase,
  TestRun,
  TestExecution,
  Defect,
  FirebaseConfigInput,
} from '../types/qa';
import { StorageService } from '../services/storage/StorageService';
import { LocalStorageService } from '../services/storage/LocalStorageService';
import { FirebaseStorageService } from '../services/storage/FirebaseStorageService';
import { User } from 'firebase/auth';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StorageContextType {
  storageMode: 'demo' | 'firebase';
  storageModeName: string;
  isCloudConnected: boolean;
  firebaseUser: User | null;

  // Data
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  testSuites: TestSuite[];
  testCases: TestCase[];
  testRuns: TestRun[];
  executions: TestExecution[];
  defects: Defect[];

  // States
  isLoading: boolean;
  error: string | null;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Project CRUD
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Suite CRUD
  createSuite: (data: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TestSuite>;
  updateSuite: (id: string, updates: Partial<TestSuite>) => Promise<TestSuite>;
  deleteSuite: (id: string, unassignCases: boolean) => Promise<void>;

  // Test Case CRUD
  createTestCase: (data: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TestCase>;
  updateTestCase: (id: string, updates: Partial<TestCase>) => Promise<TestCase>;
  duplicateTestCase: (id: string) => Promise<TestCase>;
  deleteTestCase: (id: string) => Promise<void>;
  bulkDeleteTestCases: (ids: string[]) => Promise<void>;
  bulkAssignSuite: (caseIds: string[], suiteId: string | undefined) => Promise<void>;

  // Test Run CRUD
  createTestRun: (data: Omit<TestRun, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TestRun>;
  updateTestRun: (id: string, updates: Partial<TestRun>) => Promise<TestRun>;
  deleteTestRun: (id: string) => Promise<void>;

  // Executions
  recordExecution: (data: Omit<TestExecution, 'id'> & { id?: string }) => Promise<TestExecution>;

  // Defects
  createDefect: (data: Omit<Defect, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Defect>;
  updateDefect: (id: string, updates: Partial<Defect>) => Promise<Defect>;
  deleteDefect: (id: string) => Promise<void>;

  // Management
  resetDemoData: () => void;
  exportBackupJson: () => string;
  importBackupJson: (json: string) => void;
  configureFirebase: (config: FirebaseConfigInput) => boolean;
  clearFirebaseConfig: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutCurrentUser: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStorageService] = useState(() => new LocalStorageService());
  const [firebaseStorageService] = useState(() => new FirebaseStorageService());
  const [storageMode, setStorageMode] = useState<'demo' | 'firebase'>('demo');

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string>('');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const activeService: StorageService = useMemo(() => {
    return storageMode === 'firebase' && firebaseStorageService.isCloudConnected()
      ? firebaseStorageService
      : localStorageService;
  }, [storageMode, firebaseStorageService, localStorageService]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch project-specific data
  const loadProjectData = useCallback(async (projId: string, svc: StorageService) => {
    if (!projId) {
      setTestSuites([]);
      setTestCases([]);
      setTestRuns([]);
      setExecutions([]);
      setDefects([]);
      return;
    }

    try {
      const [suitesData, casesData, runsData, execsData, defectsData] = await Promise.all([
        svc.getTestSuites(projId),
        svc.getTestCases(projId),
        svc.getTestRuns(projId),
        svc.getAllProjectExecutions(projId),
        svc.getDefects(projId),
      ]);

      setTestSuites(suitesData);
      setTestCases(casesData);
      setTestRuns(runsData);
      setExecutions(execsData);
      setDefects(defectsData);
    } catch (err: any) {
      console.error('Error loading project data', err);
      showToast(`Failed to load project records: ${err.message}`, 'error');
    }
  }, [showToast]);

  // Initial load or mode change
  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const svc = activeService;
      const projs = await svc.getProjects();
      setProjects(projs);

      let targetId = activeProjectId;
      if (!targetId || !projs.some((p) => p.id === targetId)) {
        const firstActive = projs.find((p) => p.status === 'Active') || projs[0];
        targetId = firstActive ? firstActive.id : '';
        setActiveProjectIdState(targetId);
      }

      if (targetId) {
        await loadProjectData(targetId, svc);
      }
    } catch (err: any) {
      console.error('Failed to load QA data', err);
      setError(err.message || 'Error connecting to database');
    } finally {
      setIsLoading(false);
    }
  }, [activeService, activeProjectId, loadProjectData]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // When activeProjectId changes
  const setActiveProjectId = useCallback(
    async (id: string) => {
      setActiveProjectIdState(id);
      setIsLoading(true);
      await loadProjectData(id, activeService);
      setIsLoading(false);
    },
    [activeService, loadProjectData]
  );

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // --- Projects Operations ---
  const createProject = useCallback(
    async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
      const id = `proj-${Date.now()}`;
      const created = await activeService.createProject({ ...data, id });
      const updatedList = await activeService.getProjects();
      setProjects(updatedList);
      setActiveProjectId(created.id);
      showToast(`Project "${created.name}" created successfully.`, 'success');
      return created;
    },
    [activeService, setActiveProjectId, showToast]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>): Promise<Project> => {
      const updated = await activeService.updateProject(id, updates);
      const updatedList = await activeService.getProjects();
      setProjects(updatedList);
      showToast(`Project "${updated.name}" updated.`, 'success');
      return updated;
    },
    [activeService, showToast]
  );

  const archiveProject = useCallback(
    async (id: string) => {
      await updateProject(id, { status: 'Archived' });
      showToast('Project archived.', 'info');
    },
    [updateProject, showToast]
  );

  const restoreProject = useCallback(
    async (id: string) => {
      await updateProject(id, { status: 'Active' });
      showToast('Project restored to Active.', 'success');
    },
    [updateProject, showToast]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await activeService.deleteProject(id);
      const updatedList = await activeService.getProjects();
      setProjects(updatedList);
      const nextActive = updatedList.find((p) => p.id !== id && p.status === 'Active') || updatedList[0];
      if (nextActive) {
        setActiveProjectId(nextActive.id);
      } else {
        setActiveProjectId('');
      }
      showToast('Project and its records deleted permanently.', 'info');
    },
    [activeService, setActiveProjectId, showToast]
  );

  // --- Suite Operations ---
  const createSuite = useCallback(
    async (data: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSuite> => {
      const id = `ts-${Date.now()}`;
      const created = await activeService.createTestSuite({ ...data, id });
      setTestSuites((prev) => [created, ...prev]);
      showToast(`Test suite "${created.name}" created.`, 'success');
      return created;
    },
    [activeService, showToast]
  );

  const updateSuite = useCallback(
    async (id: string, updates: Partial<TestSuite>): Promise<TestSuite> => {
      const updated = await activeService.updateTestSuite(id, updates);
      setTestSuites((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast(`Test suite updated.`, 'success');
      return updated;
    },
    [activeService, showToast]
  );

  const deleteSuite = useCallback(
    async (id: string, unassignCases: boolean) => {
      await activeService.deleteTestSuite(id, unassignCases);
      setTestSuites((prev) => prev.filter((s) => s.id !== id));
      if (unassignCases) {
        setTestCases((prev) =>
          prev.map((c) => (c.suiteId === id ? { ...c, suiteId: undefined } : c))
        );
      }
      showToast(`Test suite removed.${unassignCases ? ' Linked cases set to unassigned.' : ''}`, 'info');
    },
    [activeService, showToast]
  );

  // --- Test Case Operations ---
  const createTestCase = useCallback(
    async (data: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> => {
      const created = await activeService.createTestCase({ ...data, id: '' });
      setTestCases((prev) => [created, ...prev]);
      showToast(`Test case ${created.id} created.`, 'success');
      return created;
    },
    [activeService, showToast]
  );

  const updateTestCase = useCallback(
    async (id: string, updates: Partial<TestCase>): Promise<TestCase> => {
      const updated = await activeService.updateTestCase(id, updates);
      setTestCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast(`Test case ${updated.id} updated.`, 'success');
      return updated;
    },
    [activeService, showToast]
  );

  const duplicateTestCase = useCallback(
    async (id: string): Promise<TestCase> => {
      const duplicated = await activeService.duplicateTestCase(id);
      setTestCases((prev) => [duplicated, ...prev]);
      showToast(`Duplicated as ${duplicated.id}.`, 'success');
      return duplicated;
    },
    [activeService, showToast]
  );

  const deleteTestCase = useCallback(
    async (id: string) => {
      await activeService.deleteTestCase(id);
      setTestCases((prev) => prev.filter((c) => c.id !== id));
      showToast(`Test case ${id} deleted.`, 'info');
    },
    [activeService, showToast]
  );

  const bulkDeleteTestCases = useCallback(
    async (ids: string[]) => {
      await activeService.bulkDeleteTestCases(ids);
      const set = new Set(ids);
      setTestCases((prev) => prev.filter((c) => !set.has(c.id)));
      showToast(`${ids.length} test cases deleted.`, 'info');
    },
    [activeService, showToast]
  );

  const bulkAssignSuite = useCallback(
    async (caseIds: string[], suiteId: string | undefined) => {
      await activeService.bulkAssignSuite(caseIds, suiteId);
      const set = new Set(caseIds);
      setTestCases((prev) =>
        prev.map((c) => (set.has(c.id) ? { ...c, suiteId } : c))
      );
      showToast(`${caseIds.length} test cases updated.`, 'success');
    },
    [activeService, showToast]
  );

  // --- Test Run Operations ---
  const createTestRun = useCallback(
    async (data: Omit<TestRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestRun> => {
      const created = await activeService.createTestRun({ ...data, id: '' });
      setTestRuns((prev) => [created, ...prev]);
      showToast(`Test run ${created.id} created.`, 'success');
      return created;
    },
    [activeService, showToast]
  );

  const updateTestRun = useCallback(
    async (id: string, updates: Partial<TestRun>): Promise<TestRun> => {
      const updated = await activeService.updateTestRun(id, updates);
      setTestRuns((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast(`Test run ${updated.id} updated.`, 'success');
      return updated;
    },
    [activeService, showToast]
  );

  const deleteTestRun = useCallback(
    async (id: string) => {
      await activeService.deleteTestRun(id);
      setTestRuns((prev) => prev.filter((r) => r.id !== id));
      setExecutions((prev) => prev.filter((e) => e.runId !== id));
      showToast(`Test run ${id} deleted.`, 'info');
    },
    [activeService, showToast]
  );

  // --- Test Executions ---
  const recordExecution = useCallback(
    async (data: Omit<TestExecution, 'id'> & { id?: string }): Promise<TestExecution> => {
      const exec = await activeService.recordExecution(data);
      setExecutions((prev) => {
        const idx = prev.findIndex((e) => e.runId === exec.runId && e.testCaseId === exec.testCaseId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = exec;
          return updated;
        }
        return [...prev, exec];
      });

      // Update test run in list if status moved to In Progress
      setTestRuns((prev) =>
        prev.map((r) => {
          if (r.id === exec.runId && r.status === 'Planned') {
            return { ...r, status: 'In Progress', startTime: r.startTime || new Date().toISOString() };
          }
          return r;
        })
      );

      showToast(`Recorded execution for ${exec.testCaseId} as ${exec.result}.`, 'success');
      return exec;
    },
    [activeService, showToast]
  );

  // --- Defects Operations ---
  const createDefect = useCallback(
    async (data: Omit<Defect, 'id' | 'createdAt' | 'updatedAt'>): Promise<Defect> => {
      const created = await activeService.createDefect({ ...data, id: '' });
      setDefects((prev) => [created, ...prev]);

      // If linked to execution, update local execution state
      if (created.linkedExecutionId) {
        setExecutions((prev) =>
          prev.map((e) => {
            if (e.id === created.linkedExecutionId) {
              const current = e.linkedDefectIds || [];
              return { ...e, linkedDefectIds: [...current, created.id] };
            }
            return e;
          })
        );
      }

      showToast(`Defect ${created.id} reported.`, 'success');
      return created;
    },
    [activeService, showToast]
  );

  const updateDefect = useCallback(
    async (id: string, updates: Partial<Defect>): Promise<Defect> => {
      const updated = await activeService.updateDefect(id, updates);
      setDefects((prev) => prev.map((d) => (d.id === id ? updated : d)));
      showToast(`Defect ${updated.id} updated.`, 'success');
      return updated;
    },
    [activeService, showToast]
  );

  const deleteDefect = useCallback(
    async (id: string) => {
      await activeService.deleteDefect(id);
      setDefects((prev) => prev.filter((d) => d.id !== id));
      setExecutions((prev) =>
        prev.map((e) => {
          if (e.linkedDefectIds && e.linkedDefectIds.includes(id)) {
            return { ...e, linkedDefectIds: e.linkedDefectIds.filter((x) => x !== id) };
          }
          return e;
        })
      );
      showToast(`Defect ${id} deleted.`, 'info');
    },
    [activeService, showToast]
  );

  // --- Reset & Backup ---
  const resetDemoData = useCallback(() => {
    localStorageService.resetToDemo();
    refreshAllData();
    showToast('Reset sample data to initial state.', 'info');
  }, [localStorageService, refreshAllData, showToast]);

  const exportBackupJson = useCallback(() => {
    return localStorageService.exportBackupJson();
  }, [localStorageService]);

  const importBackupJson = useCallback(
    (json: string) => {
      try {
        localStorageService.importBackupJson(json);
        refreshAllData();
        showToast('Backup successfully restored.', 'success');
      } catch (err: any) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
    },
    [localStorageService, refreshAllData, showToast]
  );

  // --- Firebase Config & Auth ---
  const configureFirebase = useCallback(
    (cfg: FirebaseConfigInput) => {
      try {
        firebaseStorageService.initialize(cfg);
        setStorageMode('firebase');
        refreshAllData();
        showToast('Firebase client initialized.', 'success');
        return true;
      } catch (e: any) {
        showToast(`Firebase configuration error: ${e.message}`, 'error');
        return false;
      }
    },
    [firebaseStorageService, refreshAllData, showToast]
  );

  const clearFirebaseConfig = useCallback(() => {
    firebaseStorageService.clearConfig();
    setStorageMode('demo');
    setFirebaseUser(null);
    refreshAllData();
    showToast('Reverted to local Demo Mode.', 'info');
  }, [firebaseStorageService, refreshAllData, showToast]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const user = await firebaseStorageService.signInGoogle();
      setFirebaseUser(user);
      await refreshAllData();
      showToast(`Signed in as ${user.displayName || user.email}`, 'success');
    } catch (e: any) {
      showToast(`Sign in failed: ${e.message}`, 'error');
    }
  }, [firebaseStorageService, refreshAllData, showToast]);

  const signOutCurrentUser = useCallback(async () => {
    try {
      await firebaseStorageService.signOutUser();
      setFirebaseUser(null);
      showToast('Signed out from Firebase.', 'info');
    } catch (e: any) {
      showToast(`Sign out error: ${e.message}`, 'error');
    }
  }, [firebaseStorageService, showToast]);

  const value: StorageContextType = {
    storageMode,
    storageModeName: activeService.getStorageModeName(),
    isCloudConnected: activeService.isCloudConnected(),
    firebaseUser,

    projects,
    activeProject,
    setActiveProjectId,
    testSuites,
    testCases,
    testRuns,
    executions,
    defects,

    isLoading,
    error,
    toasts,
    showToast,
    removeToast,

    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,

    createSuite,
    updateSuite,
    deleteSuite,

    createTestCase,
    updateTestCase,
    duplicateTestCase,
    deleteTestCase,
    bulkDeleteTestCases,
    bulkAssignSuite,

    createTestRun,
    updateTestRun,
    deleteTestRun,

    recordExecution,

    createDefect,
    updateDefect,
    deleteDefect,

    resetDemoData,
    exportBackupJson,
    importBackupJson,
    configureFirebase,
    clearFirebaseConfig,
    signInWithGoogle,
    signOutCurrentUser,
    refreshAllData,
  };

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
