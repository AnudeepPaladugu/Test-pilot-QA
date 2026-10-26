/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Project,
  TestSuite,
  TestCase,
  TestRun,
  TestExecution,
  Defect,
} from '../../types/qa';
import { StorageService } from './StorageService';
import {
  initialProjects,
  initialSuites,
  initialTestCases,
  initialTestRuns,
  initialExecutions,
  initialDefects,
} from './demoData';
import { generateNextId } from '../../utils/qaCalculations';

const KEYS = {
  PROJECTS: 'testpilot_qa_projects',
  SUITES: 'testpilot_qa_suites',
  TEST_CASES: 'testpilot_qa_testcases',
  TEST_RUNS: 'testpilot_qa_testruns',
  EXECUTIONS: 'testpilot_qa_executions',
  DEFECTS: 'testpilot_qa_defects',
  INITIALIZED: 'testpilot_qa_initialized_v1',
};

export class LocalStorageService implements StorageService {
  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (typeof window === 'undefined') return;

    try {
      const initialized = localStorage.getItem(KEYS.INITIALIZED);
      if (!initialized) {
        localStorage.setItem(KEYS.PROJECTS, JSON.stringify(initialProjects));
        localStorage.setItem(KEYS.SUITES, JSON.stringify(initialSuites));
        localStorage.setItem(KEYS.TEST_CASES, JSON.stringify(initialTestCases));
        localStorage.setItem(KEYS.TEST_RUNS, JSON.stringify(initialTestRuns));
        localStorage.setItem(KEYS.EXECUTIONS, JSON.stringify(initialExecutions));
        localStorage.setItem(KEYS.DEFECTS, JSON.stringify(initialDefects));
        localStorage.setItem(KEYS.INITIALIZED, 'true');
      }
    } catch (e) {
      console.error('Failed to initialize demo data in localStorage', e);
    }
  }

  private load<T>(key: string, fallback: T[]): T[] {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving key ${key} to localStorage`, e);
      throw new Error(`Browser storage quota exceeded or unavailable.`);
    }
  }

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    return this.load<Project>(KEYS.PROJECTS, initialProjects);
  }

  async getProject(id: string): Promise<Project | null> {
    const list = await this.getProjects();
    return list.find((p) => p.id === id) || null;
  }

  async createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project> {
    const list = await this.getProjects();
    // Validate key uniqueness
    const keyExists = list.some((p) => p.key.toUpperCase() === project.key.toUpperCase());
    if (keyExists) {
      throw new Error(`Project key "${project.key.toUpperCase()}" is already in use.`);
    }

    const now = new Date().toISOString();
    const newProj: Project = {
      ...project,
      key: project.key.toUpperCase(),
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newProj);
    this.save(KEYS.PROJECTS, list);
    return newProj;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const list = await this.getProjects();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Project with ID ${id} not found.`);

    if (updates.key) {
      const keyExists = list.some(
        (p) => p.id !== id && p.key.toUpperCase() === updates.key?.toUpperCase()
      );
      if (keyExists) {
        throw new Error(`Project key "${updates.key.toUpperCase()}" is already in use.`);
      }
    }

    const updated: Project = {
      ...list[index],
      ...updates,
      key: updates.key ? updates.key.toUpperCase() : list[index].key,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.save(KEYS.PROJECTS, list);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    const list = await this.getProjects();
    const filtered = list.filter((p) => p.id !== id);
    this.save(KEYS.PROJECTS, filtered);

    // Clean up dependent items
    const suites = (await this.getTestSuites(id)).map((s) => s.id);
    const cases = (await this.getTestCases(id)).map((c) => c.id);
    const runs = (await this.getTestRuns(id)).map((r) => r.id);

    const allSuites = this.load<TestSuite>(KEYS.SUITES, []).filter((s) => s.projectId !== id);
    this.save(KEYS.SUITES, allSuites);

    const allCases = this.load<TestCase>(KEYS.TEST_CASES, []).filter((c) => c.projectId !== id);
    this.save(KEYS.TEST_CASES, allCases);

    const allRuns = this.load<TestRun>(KEYS.TEST_RUNS, []).filter((r) => r.projectId !== id);
    this.save(KEYS.TEST_RUNS, allRuns);

    const allExecs = this.load<TestExecution>(KEYS.EXECUTIONS, []).filter(
      (e) => !runs.includes(e.runId) && !cases.includes(e.testCaseId)
    );
    this.save(KEYS.EXECUTIONS, allExecs);

    const allDefects = this.load<Defect>(KEYS.DEFECTS, []).filter((d) => d.projectId !== id);
    this.save(KEYS.DEFECTS, allDefects);
  }

  // --- Test Suites ---
  async getTestSuites(projectId: string): Promise<TestSuite[]> {
    const list = this.load<TestSuite>(KEYS.SUITES, initialSuites);
    return list.filter((s) => s.projectId === projectId);
  }

  async createTestSuite(suite: Omit<TestSuite, 'createdAt' | 'updatedAt'>): Promise<TestSuite> {
    const list = this.load<TestSuite>(KEYS.SUITES, initialSuites);
    const now = new Date().toISOString();
    const newSuite: TestSuite = {
      ...suite,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newSuite);
    this.save(KEYS.SUITES, list);
    return newSuite;
  }

  async updateTestSuite(id: string, updates: Partial<TestSuite>): Promise<TestSuite> {
    const list = this.load<TestSuite>(KEYS.SUITES, initialSuites);
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Suite ${id} not found.`);

    const updated: TestSuite = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.save(KEYS.SUITES, list);
    return updated;
  }

  async deleteTestSuite(id: string, unassignCases: boolean): Promise<void> {
    const list = this.load<TestSuite>(KEYS.SUITES, initialSuites);
    const filtered = list.filter((s) => s.id !== id);
    this.save(KEYS.SUITES, filtered);

    if (unassignCases) {
      // Unassign test cases from this suite
      const cases = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
      const updatedCases = cases.map((c) =>
        c.suiteId === id ? { ...c, suiteId: undefined, updatedAt: new Date().toISOString() } : c
      );
      this.save(KEYS.TEST_CASES, updatedCases);
    }
  }

  // --- Test Cases ---
  async getTestCases(projectId: string): Promise<TestCase[]> {
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    return list.filter((c) => c.projectId === projectId);
  }

  async getTestCase(id: string): Promise<TestCase | null> {
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    return list.find((c) => c.id === id) || null;
  }

  async createTestCase(testCase: Omit<TestCase, 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    const now = new Date().toISOString();

    let tcId = testCase.id;
    if (!tcId || tcId.trim() === '') {
      const existingIds = list.filter((c) => c.projectId === testCase.projectId).map((c) => c.id);
      tcId = generateNextId('TC', existingIds);
    }

    const newCase: TestCase = {
      ...testCase,
      id: tcId,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newCase);
    this.save(KEYS.TEST_CASES, list);
    return newCase;
  }

  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase> {
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Test case ${id} not found.`);

    const updated: TestCase = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.save(KEYS.TEST_CASES, list);
    return updated;
  }

  async duplicateTestCase(id: string): Promise<TestCase> {
    const original = await this.getTestCase(id);
    if (!original) throw new Error(`Test case ${id} not found.`);

    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    const projectCases = list.filter((c) => c.projectId === original.projectId);
    const newId = generateNextId('TC', projectCases.map((c) => c.id));
    const now = new Date().toISOString();

    const duplicated: TestCase = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      steps: original.steps.map((s) => ({ ...s })),
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(duplicated);
    this.save(KEYS.TEST_CASES, list);
    return duplicated;
  }

  async deleteTestCase(id: string): Promise<void> {
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    const filtered = list.filter((c) => c.id !== id);
    this.save(KEYS.TEST_CASES, filtered);
  }

  async bulkDeleteTestCases(ids: string[]): Promise<void> {
    const set = new Set(ids);
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    const filtered = list.filter((c) => !set.has(c.id));
    this.save(KEYS.TEST_CASES, filtered);
  }

  async bulkAssignSuite(caseIds: string[], suiteId: string | undefined): Promise<void> {
    const set = new Set(caseIds);
    const list = this.load<TestCase>(KEYS.TEST_CASES, initialTestCases);
    const now = new Date().toISOString();
    const updated = list.map((c) => (set.has(c.id) ? { ...c, suiteId, updatedAt: now } : c));
    this.save(KEYS.TEST_CASES, updated);
  }

  // --- Test Runs ---
  async getTestRuns(projectId: string): Promise<TestRun[]> {
    const list = this.load<TestRun>(KEYS.TEST_RUNS, initialTestRuns);
    return list.filter((r) => r.projectId === projectId);
  }

  async getTestRun(id: string): Promise<TestRun | null> {
    const list = this.load<TestRun>(KEYS.TEST_RUNS, initialTestRuns);
    return list.find((r) => r.id === id) || null;
  }

  async createTestRun(run: Omit<TestRun, 'createdAt' | 'updatedAt'>): Promise<TestRun> {
    const list = this.load<TestRun>(KEYS.TEST_RUNS, initialTestRuns);
    const now = new Date().toISOString();

    let runId = run.id;
    if (!runId || runId.trim() === '') {
      const existingIds = list.filter((r) => r.projectId === run.projectId).map((r) => r.id);
      runId = generateNextId('TR', existingIds);
    }

    const newRun: TestRun = {
      ...run,
      id: runId,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newRun);
    this.save(KEYS.TEST_RUNS, list);
    return newRun;
  }

  async updateTestRun(id: string, updates: Partial<TestRun>): Promise<TestRun> {
    const list = this.load<TestRun>(KEYS.TEST_RUNS, initialTestRuns);
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Test run ${id} not found.`);

    const updated: TestRun = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.save(KEYS.TEST_RUNS, list);
    return updated;
  }

  async deleteTestRun(id: string): Promise<void> {
    const list = this.load<TestRun>(KEYS.TEST_RUNS, initialTestRuns);
    const filtered = list.filter((r) => r.id !== id);
    this.save(KEYS.TEST_RUNS, filtered);

    // Delete associated executions
    const execs = this.load<TestExecution>(KEYS.EXECUTIONS, initialExecutions);
    const filteredExecs = execs.filter((e) => e.runId !== id);
    this.save(KEYS.EXECUTIONS, filteredExecs);
  }

  // --- Executions ---
  async getExecutions(runId: string): Promise<TestExecution[]> {
    const list = this.load<TestExecution>(KEYS.EXECUTIONS, initialExecutions);
    return list.filter((e) => e.runId === runId);
  }

  async getAllProjectExecutions(projectId: string): Promise<TestExecution[]> {
    const runs = await this.getTestRuns(projectId);
    const runIdSet = new Set(runs.map((r) => r.id));
    const allExecs = this.load<TestExecution>(KEYS.EXECUTIONS, initialExecutions);
    return allExecs.filter((e) => runIdSet.has(e.runId));
  }

  async recordExecution(
    execution: Omit<TestExecution, 'id'> & { id?: string }
  ): Promise<TestExecution> {
    const list = this.load<TestExecution>(KEYS.EXECUTIONS, initialExecutions);
    const now = new Date().toISOString();

    const existingIndex = list.findIndex(
      (e) => e.runId === execution.runId && e.testCaseId === execution.testCaseId
    );

    const execId = execution.id || (existingIndex >= 0 ? list[existingIndex].id : `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`);

    const newExec: TestExecution = {
      ...execution,
      id: execId,
      executedAt: execution.executedAt || now,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = newExec;
    } else {
      list.push(newExec);
    }

    this.save(KEYS.EXECUTIONS, list);

    // Auto-advance TestRun status to 'In Progress' if it was 'Planned'
    const run = await this.getTestRun(execution.runId);
    if (run && run.status === 'Planned') {
      await this.updateTestRun(run.id, {
        status: 'In Progress',
        startTime: run.startTime || now,
      });
    }

    return newExec;
  }

  // --- Defects ---
  async getDefects(projectId: string): Promise<Defect[]> {
    const list = this.load<Defect>(KEYS.DEFECTS, initialDefects);
    return list.filter((d) => d.projectId === projectId);
  }

  async getDefect(id: string): Promise<Defect | null> {
    const list = this.load<Defect>(KEYS.DEFECTS, initialDefects);
    return list.find((d) => d.id === id) || null;
  }

  async createDefect(defect: Omit<Defect, 'createdAt' | 'updatedAt'>): Promise<Defect> {
    const list = this.load<Defect>(KEYS.DEFECTS, initialDefects);
    const now = new Date().toISOString();

    let defId = defect.id;
    if (!defId || defId.trim() === '') {
      const existingIds = list.filter((d) => d.projectId === defect.projectId).map((d) => d.id);
      defId = generateNextId('BUG', existingIds);
    }

    const newDefect: Defect = {
      ...defect,
      id: defId,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newDefect);
    this.save(KEYS.DEFECTS, list);

    // If linked to an execution, add defect ID to execution's linkedDefectIds
    if (defect.linkedExecutionId) {
      const execs = this.load<TestExecution>(KEYS.EXECUTIONS, initialExecutions);
      const exIdx = execs.findIndex((e) => e.id === defect.linkedExecutionId);
      if (exIdx >= 0) {
        const existingLinks = execs[exIdx].linkedDefectIds || [];
        if (!existingLinks.includes(defId)) {
          execs[exIdx].linkedDefectIds = [...existingLinks, defId];
          this.save(KEYS.EXECUTIONS, execs);
        }
      }
    }

    return newDefect;
  }

  async updateDefect(id: string, updates: Partial<Defect>): Promise<Defect> {
    const list = this.load<Defect>(KEYS.DEFECTS, initialDefects);
    const index = list.findIndex((d) => d.id === id);
    if (index === -1) throw new Error(`Defect ${id} not found.`);

    const updated: Defect = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.save(KEYS.DEFECTS, list);
    return updated;
  }

  async deleteDefect(id: string): Promise<void> {
    const list = this.load<Defect>(KEYS.DEFECTS, initialDefects);
    const filtered = list.filter((d) => d.id !== id);
    this.save(KEYS.DEFECTS, filtered);

    // Remove from executions
    const execs = this.load<TestExecution>(KEYS.EXECUTIONS, initialExecutions);
    let changed = false;
    for (const exec of execs) {
      if (exec.linkedDefectIds && exec.linkedDefectIds.includes(id)) {
        exec.linkedDefectIds = exec.linkedDefectIds.filter((x) => x !== id);
        changed = true;
      }
    }
    if (changed) this.save(KEYS.EXECUTIONS, execs);
  }

  // --- Reset & Backup Management ---
  resetToDemo(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(initialProjects));
    localStorage.setItem(KEYS.SUITES, JSON.stringify(initialSuites));
    localStorage.setItem(KEYS.TEST_CASES, JSON.stringify(initialTestCases));
    localStorage.setItem(KEYS.TEST_RUNS, JSON.stringify(initialTestRuns));
    localStorage.setItem(KEYS.EXECUTIONS, JSON.stringify(initialExecutions));
    localStorage.setItem(KEYS.DEFECTS, JSON.stringify(initialDefects));
  }

  exportBackupJson(): string {
    const backup = {
      projects: this.load(KEYS.PROJECTS, initialProjects),
      suites: this.load(KEYS.SUITES, initialSuites),
      testCases: this.load(KEYS.TEST_CASES, initialTestCases),
      testRuns: this.load(KEYS.TEST_RUNS, initialTestRuns),
      executions: this.load(KEYS.EXECUTIONS, initialExecutions),
      defects: this.load(KEYS.DEFECTS, initialDefects),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackupJson(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid backup file: missing projects array.');
      }
      this.save(KEYS.PROJECTS, data.projects);
      if (Array.isArray(data.suites)) this.save(KEYS.SUITES, data.suites);
      if (Array.isArray(data.testCases)) this.save(KEYS.TEST_CASES, data.testCases);
      if (Array.isArray(data.testRuns)) this.save(KEYS.TEST_RUNS, data.testRuns);
      if (Array.isArray(data.executions)) this.save(KEYS.EXECUTIONS, data.executions);
      if (Array.isArray(data.defects)) this.save(KEYS.DEFECTS, data.defects);
    } catch (e: any) {
      throw new Error(`Import failed: ${e.message}`);
    }
  }

  isCloudConnected(): boolean {
    return false;
  }

  getStorageModeName(): string {
    return 'Demo Mode (Local Storage)';
  }
}
