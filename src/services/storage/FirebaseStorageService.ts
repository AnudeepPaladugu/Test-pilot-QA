/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  Project,
  TestSuite,
  TestCase,
  TestRun,
  TestExecution,
  Defect,
  FirebaseConfigInput,
} from '../../types/qa';
import { StorageService } from './StorageService';
import { generateNextId } from '../../utils/qaCalculations';

const FIREBASE_CONFIG_KEY = 'testpilot_firebase_client_config';

export class FirebaseStorageService implements StorageService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private currentUser: User | null = null;
  private config: FirebaseConfigInput | null = null;

  constructor() {
    this.tryInitStoredConfig();
  }

  private tryInitStoredConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(FIREBASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FirebaseConfigInput;
        this.initialize(parsed);
      }
    } catch (e) {
      console.warn('Could not auto-initialize Firebase from storage', e);
    }
  }

  public initialize(config: FirebaseConfigInput): boolean {
    try {
      if (!config.apiKey || !config.projectId) {
        throw new Error('Missing required Firebase API Key or Project ID.');
      }
      this.config = config;

      const existingApps = getApps();
      this.app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
      }
      return true;
    } catch (e) {
      console.error('Firebase initialization error', e);
      throw e;
    }
  }

  public clearConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FIREBASE_CONFIG_KEY);
    }
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.config = null;
  }

  public getSavedConfig(): FirebaseConfigInput | null {
    return this.config;
  }

  public isCloudConnected(): boolean {
    return !!(this.db && this.currentUser);
  }

  public getStorageModeName(): string {
    return this.isCloudConnected() ? 'Cloud Firestore' : 'Unconnected (Requires Setup)';
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public async signInGoogle(): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase Auth is not initialized. Please configure Firebase settings first.');
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    this.currentUser = result.user;
    return result.user;
  }

  public async signOutUser(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
    this.currentUser = null;
  }

  private getUid(): string {
    if (!this.currentUser) {
      throw new Error('Authentication required. Please sign in to access Cloud Firestore.');
    }
    return this.currentUser.uid;
  }

  private ensureDb(): Firestore {
    if (!this.db) {
      throw new Error('Firestore is not initialized. Please verify your Firebase configuration in Settings.');
    }
    return this.db;
  }

  // Paths follow users/{uid}/projects/{projectId} data model
  private userProjectsRef() {
    return collection(this.ensureDb(), 'users', this.getUid(), 'projects');
  }

  private projectSuitesRef(projectId: string) {
    return collection(this.ensureDb(), 'users', this.getUid(), 'projects', projectId, 'testSuites');
  }

  private projectCasesRef(projectId: string) {
    return collection(this.ensureDb(), 'users', this.getUid(), 'projects', projectId, 'testCases');
  }

  private projectRunsRef(projectId: string) {
    return collection(this.ensureDb(), 'users', this.getUid(), 'projects', projectId, 'testRuns');
  }

  private projectExecutionsRef(projectId: string) {
    return collection(this.ensureDb(), 'users', this.getUid(), 'projects', projectId, 'executions');
  }

  private projectDefectsRef(projectId: string) {
    return collection(this.ensureDb(), 'users', this.getUid(), 'projects', projectId, 'defects');
  }

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    const snap = await getDocs(this.userProjectsRef());
    return snap.docs.map((d) => d.data() as Project);
  }

  async getProject(id: string): Promise<Project | null> {
    const d = doc(this.ensureDb(), 'users', this.getUid(), 'projects', id);
    const snap = await getDoc(d);
    return snap.exists() ? (snap.data() as Project) : null;
  }

  async createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project> {
    const now = new Date().toISOString();
    const projects = await this.getProjects();
    const keyExists = projects.some((p) => p.key.toUpperCase() === project.key.toUpperCase());
    if (keyExists) {
      throw new Error(`Project key "${project.key.toUpperCase()}" is already in use.`);
    }

    const newProj: Project = {
      ...project,
      key: project.key.toUpperCase(),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(this.ensureDb(), 'users', this.getUid(), 'projects', project.id);
    await setDoc(docRef, newProj);
    return newProj;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const docRef = doc(this.ensureDb(), 'users', this.getUid(), 'projects', id);
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project ${id} not found.`);

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: now,
    };
    await updateDoc(docRef, { ...updates, updatedAt: now });
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    const docRef = doc(this.ensureDb(), 'users', this.getUid(), 'projects', id);
    await deleteDoc(docRef);
  }

  // --- Test Suites ---
  async getTestSuites(projectId: string): Promise<TestSuite[]> {
    const snap = await getDocs(this.projectSuitesRef(projectId));
    return snap.docs.map((d) => d.data() as TestSuite);
  }

  async createTestSuite(suite: Omit<TestSuite, 'createdAt' | 'updatedAt'>): Promise<TestSuite> {
    const now = new Date().toISOString();
    const newSuite: TestSuite = {
      ...suite,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(this.projectSuitesRef(suite.projectId), suite.id);
    await setDoc(docRef, newSuite);
    return newSuite;
  }

  async updateTestSuite(id: string, updates: Partial<TestSuite>): Promise<TestSuite> {
    const projectId = updates.projectId;
    if (!projectId) throw new Error('ProjectId required for updateTestSuite.');
    const docRef = doc(this.projectSuitesRef(projectId), id);
    const now = new Date().toISOString();
    await updateDoc(docRef, { ...updates, updatedAt: now });
    const snap = await getDoc(docRef);
    return snap.data() as TestSuite;
  }

  async deleteTestSuite(id: string, unassignCases: boolean): Promise<void> {
    // Note: ProjectId must be known or queried.
    const projects = await this.getProjects();
    for (const p of projects) {
      const docRef = doc(this.projectSuitesRef(p.id), id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await deleteDoc(docRef);
        if (unassignCases) {
          const cases = await this.getTestCases(p.id);
          for (const c of cases) {
            if (c.suiteId === id) {
              await this.updateTestCase(c.id, { suiteId: undefined });
            }
          }
        }
        break;
      }
    }
  }

  // --- Test Cases ---
  async getTestCases(projectId: string): Promise<TestCase[]> {
    const snap = await getDocs(this.projectCasesRef(projectId));
    return snap.docs.map((d) => d.data() as TestCase);
  }

  async getTestCase(id: string): Promise<TestCase | null> {
    const projects = await this.getProjects();
    for (const p of projects) {
      const docRef = doc(this.projectCasesRef(p.id), id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as TestCase;
    }
    return null;
  }

  async createTestCase(testCase: Omit<TestCase, 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    const existing = await this.getTestCases(testCase.projectId);
    let tcId = testCase.id;
    if (!tcId || tcId.trim() === '') {
      tcId = generateNextId('TC', existing.map((c) => c.id));
    }
    const now = new Date().toISOString();
    const newCase: TestCase = {
      ...testCase,
      id: tcId,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(this.projectCasesRef(testCase.projectId), tcId);
    await setDoc(docRef, newCase);
    return newCase;
  }

  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase> {
    const existing = await this.getTestCase(id);
    if (!existing) throw new Error(`Test case ${id} not found.`);
    const docRef = doc(this.projectCasesRef(existing.projectId), id);
    const now = new Date().toISOString();
    await updateDoc(docRef, { ...updates, updatedAt: now });
    const snap = await getDoc(docRef);
    return snap.data() as TestCase;
  }

  async duplicateTestCase(id: string): Promise<TestCase> {
    const original = await this.getTestCase(id);
    if (!original) throw new Error(`Test case ${id} not found.`);
    const existing = await this.getTestCases(original.projectId);
    const newId = generateNextId('TC', existing.map((c) => c.id));
    const now = new Date().toISOString();

    const duplicated: TestCase = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      steps: original.steps.map((s) => ({ ...s })),
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(this.projectCasesRef(original.projectId), newId);
    await setDoc(docRef, duplicated);
    return duplicated;
  }

  async deleteTestCase(id: string): Promise<void> {
    const existing = await this.getTestCase(id);
    if (!existing) return;
    const docRef = doc(this.projectCasesRef(existing.projectId), id);
    await deleteDoc(docRef);
  }

  async bulkDeleteTestCases(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteTestCase(id);
    }
  }

  async bulkAssignSuite(caseIds: string[], suiteId: string | undefined): Promise<void> {
    for (const id of caseIds) {
      await this.updateTestCase(id, { suiteId });
    }
  }

  // --- Test Runs ---
  async getTestRuns(projectId: string): Promise<TestRun[]> {
    const snap = await getDocs(this.projectRunsRef(projectId));
    return snap.docs.map((d) => d.data() as TestRun);
  }

  async getTestRun(id: string): Promise<TestRun | null> {
    const projects = await this.getProjects();
    for (const p of projects) {
      const docRef = doc(this.projectRunsRef(p.id), id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as TestRun;
    }
    return null;
  }

  async createTestRun(run: Omit<TestRun, 'createdAt' | 'updatedAt'>): Promise<TestRun> {
    const existing = await this.getTestRuns(run.projectId);
    let runId = run.id;
    if (!runId || runId.trim() === '') {
      runId = generateNextId('TR', existing.map((r) => r.id));
    }
    const now = new Date().toISOString();
    const newRun: TestRun = {
      ...run,
      id: runId,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(this.projectRunsRef(run.projectId), runId);
    await setDoc(docRef, newRun);
    return newRun;
  }

  async updateTestRun(id: string, updates: Partial<TestRun>): Promise<TestRun> {
    const existing = await this.getTestRun(id);
    if (!existing) throw new Error(`Test run ${id} not found.`);
    const docRef = doc(this.projectRunsRef(existing.projectId), id);
    const now = new Date().toISOString();
    await updateDoc(docRef, { ...updates, updatedAt: now });
    const snap = await getDoc(docRef);
    return snap.data() as TestRun;
  }

  async deleteTestRun(id: string): Promise<void> {
    const existing = await this.getTestRun(id);
    if (!existing) return;
    const docRef = doc(this.projectRunsRef(existing.projectId), id);
    await deleteDoc(docRef);
  }

  // --- Executions ---
  async getExecutions(runId: string): Promise<TestExecution[]> {
    const run = await this.getTestRun(runId);
    if (!run) return [];
    const q = query(this.projectExecutionsRef(run.projectId), where('runId', '==', runId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as TestExecution);
  }

  async getAllProjectExecutions(projectId: string): Promise<TestExecution[]> {
    const snap = await getDocs(this.projectExecutionsRef(projectId));
    return snap.docs.map((d) => d.data() as TestExecution);
  }

  async recordExecution(
    execution: Omit<TestExecution, 'id'> & { id?: string }
  ): Promise<TestExecution> {
    const run = await this.getTestRun(execution.runId);
    if (!run) throw new Error(`Test run ${execution.runId} not found.`);

    const execId = execution.id || `exec-${Date.now()}`;
    const now = new Date().toISOString();
    const newExec: TestExecution = {
      ...execution,
      id: execId,
      executedAt: execution.executedAt || now,
    };

    const docRef = doc(this.projectExecutionsRef(run.projectId), execId);
    await setDoc(docRef, newExec);

    if (run.status === 'Planned') {
      await this.updateTestRun(run.id, {
        status: 'In Progress',
        startTime: run.startTime || now,
      });
    }

    return newExec;
  }

  // --- Defects ---
  async getDefects(projectId: string): Promise<Defect[]> {
    const snap = await getDocs(this.projectDefectsRef(projectId));
    return snap.docs.map((d) => d.data() as Defect);
  }

  async getDefect(id: string): Promise<Defect | null> {
    const projects = await this.getProjects();
    for (const p of projects) {
      const docRef = doc(this.projectDefectsRef(p.id), id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as Defect;
    }
    return null;
  }

  async createDefect(defect: Omit<Defect, 'createdAt' | 'updatedAt'>): Promise<Defect> {
    const existing = await this.getDefects(defect.projectId);
    let defId = defect.id;
    if (!defId || defId.trim() === '') {
      defId = generateNextId('BUG', existing.map((d) => d.id));
    }
    const now = new Date().toISOString();
    const newDefect: Defect = {
      ...defect,
      id: defId,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(this.projectDefectsRef(defect.projectId), defId);
    await setDoc(docRef, newDefect);
    return newDefect;
  }

  async updateDefect(id: string, updates: Partial<Defect>): Promise<Defect> {
    const existing = await this.getDefect(id);
    if (!existing) throw new Error(`Defect ${id} not found.`);
    const docRef = doc(this.projectDefectsRef(existing.projectId), id);
    const now = new Date().toISOString();
    await updateDoc(docRef, { ...updates, updatedAt: now });
    const snap = await getDoc(docRef);
    return snap.data() as Defect;
  }

  async deleteDefect(id: string): Promise<void> {
    const existing = await this.getDefect(id);
    if (!existing) return;
    const docRef = doc(this.projectDefectsRef(existing.projectId), id);
    await deleteDoc(docRef);
  }
}
