/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestExecution, RunSummary } from '../types/qa';

/**
 * Calculates execution statistics for a test run.
 * Completed cases = Passed + Failed + Blocked.
 * Completion % = (Completed / Total) * 100.
 * Pass rate = (Passed / (Passed + Failed)) * 100. Returns null if Passed + Failed is 0.
 */
export function calculateRunSummary(
  testCaseIds: string[],
  executions: TestExecution[]
): RunSummary {
  const total = testCaseIds.length;
  if (total === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      notRun: 0,
      completed: 0,
      completionPercentage: 0,
      passRate: null,
    };
  }

  // Map executions by testCaseId (latest execution if multiple)
  const execMap = new Map<string, TestExecution>();
  for (const exec of executions) {
    execMap.set(exec.testCaseId, exec);
  }

  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let notRun = 0;

  for (const tcId of testCaseIds) {
    const exec = execMap.get(tcId);
    const result = exec?.result ?? 'Not Run';
    if (result === 'Passed') passed++;
    else if (result === 'Failed') failed++;
    else if (result === 'Blocked') blocked++;
    else notRun++;
  }

  const completed = passed + failed + blocked;
  const completionPercentage = Math.round((completed / total) * 100);
  const evaluated = passed + failed;
  const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : null;

  return {
    total,
    passed,
    failed,
    blocked,
    notRun,
    completed,
    completionPercentage,
    passRate,
  };
}

/**
 * Generates collision-safe readable sequential IDs like "TC-0001", "BUG-0001", "TR-0001"
 */
export function generateNextId(prefix: string, existingIds: string[]): string {
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`);

  for (const id of existingIds) {
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(4, '0');
  return `${prefix}-${padded}`;
}

/**
 * Validates project key: 2 to 10 uppercase alphanumeric characters
 */
export function isValidProjectKey(key: string): boolean {
  return /^[A-Z0-9]{2,10}$/.test(key);
}

/**
 * Validates URL format if provided
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
