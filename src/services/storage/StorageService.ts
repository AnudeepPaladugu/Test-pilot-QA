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

export interface StorageService {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Test Suites
  getTestSuites(projectId: string): Promise<TestSuite[]>;
  createTestSuite(suite: Omit<TestSuite, 'createdAt' | 'updatedAt'>): Promise<TestSuite>;
  updateTestSuite(id: string, updates: Partial<TestSuite>): Promise<TestSuite>;
  deleteTestSuite(id: string, unassignCases: boolean): Promise<void>;

  // Test Cases
  getTestCases(projectId: string): Promise<TestCase[]>;
  getTestCase(id: string): Promise<TestCase | null>;
  createTestCase(testCase: Omit<TestCase, 'createdAt' | 'updatedAt'>): Promise<TestCase>;
  updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase>;
  duplicateTestCase(id: string): Promise<TestCase>;
  deleteTestCase(id: string): Promise<void>;
  bulkDeleteTestCases(ids: string[]): Promise<void>;
  bulkAssignSuite(caseIds: string[], suiteId: string | undefined): Promise<void>;

  // Test Runs
  getTestRuns(projectId: string): Promise<TestRun[]>;
  getTestRun(id: string): Promise<TestRun | null>;
  createTestRun(run: Omit<TestRun, 'createdAt' | 'updatedAt'>): Promise<TestRun>;
  updateTestRun(id: string, updates: Partial<TestRun>): Promise<TestRun>;
  deleteTestRun(id: string): Promise<void>;

  // Test Executions
  getExecutions(runId: string): Promise<TestExecution[]>;
  getAllProjectExecutions(projectId: string): Promise<TestExecution[]>;
  recordExecution(execution: Omit<TestExecution, 'id'> & { id?: string }): Promise<TestExecution>;

  // Defects
  getDefects(projectId: string): Promise<Defect[]>;
  getDefect(id: string): Promise<Defect | null>;
  createDefect(defect: Omit<Defect, 'createdAt' | 'updatedAt'>): Promise<Defect>;
  updateDefect(id: string, updates: Partial<Defect>): Promise<Defect>;
  deleteDefect(id: string): Promise<void>;

  // Persistence management
  isCloudConnected(): boolean;
  getStorageModeName(): string;
}
