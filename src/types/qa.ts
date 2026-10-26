/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Environment = 'Development' | 'QA' | 'Staging' | 'Production' | 'Custom';
export type ProjectStatus = 'Active' | 'Archived';

export interface Project {
  id: string;
  name: string;
  key: string; // 2-10 uppercase alphanumeric
  description?: string;
  appUrl?: string;
  environment: Environment;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuite {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  module?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export type TestType =
  | 'Functional'
  | 'UI'
  | 'Regression'
  | 'Smoke'
  | 'Sanity'
  | 'Integration'
  | 'Negative'
  | 'Validation'
  | 'Compatibility'
  | 'Accessibility';

export type TestCaseStatus = 'Draft' | 'Ready' | 'Deprecated';

export interface TestCase {
  id: string; // e.g. "TC-0001"
  projectId: string;
  suiteId?: string;
  title: string;
  module: string;
  description?: string;
  preconditions?: string;
  testData?: string;
  steps: TestStep[];
  expectedResult: string;
  priority: Priority;
  type: TestType;
  method: 'Manual';
  status: TestCaseStatus;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RunStatus = 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
export type ExecutionResult = 'Not Run' | 'Passed' | 'Failed' | 'Blocked';

export interface TestRun {
  id: string; // e.g. "TR-0001"
  projectId: string;
  name: string;
  environment: Environment;
  buildVersion: string;
  description?: string;
  testCaseIds: string[];
  status: RunStatus;
  createdBy: string;
  startTime?: string;
  completionTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestExecution {
  id: string;
  runId: string;
  testCaseId: string;
  result: ExecutionResult;
  actualResult?: string;
  executionNotes?: string;
  executedBy?: string;
  executedAt?: string;
  linkedDefectIds?: string[];
}

export type DefectSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type DefectPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type DefectStatus = 'Open' | 'In Progress' | 'Fixed' | 'Retest' | 'Closed' | 'Reopened';

export interface Defect {
  id: string; // e.g. "BUG-0001"
  projectId: string;
  title: string;
  linkedTestCaseId?: string;
  linkedTestRunId?: string;
  linkedExecutionId?: string;
  description?: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: DefectSeverity;
  priority: DefectPriority;
  status: DefectStatus;
  environment: string;
  buildVersion: string;
  reporter: string;
  assignee?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  completed: number;
  completionPercentage: number;
  passRate: number | null; // null if passed + failed === 0
}

export interface FirebaseConfigInput {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}
