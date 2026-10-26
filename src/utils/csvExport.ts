/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestCase, TestExecution, Defect } from '../types/qa';

/**
 * Escapes a cell value according to RFC 4180:
 * - Prevents CSV Formula Injection: prefixes leading =, +, -, @, \t, \r with single quote '
 * - Wraps fields containing commas, quotes, or newlines in quotes
 * - Escapes internal quotes as double quotes ""
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Prevent Spreadsheet Formula Injection (CSV injection / DDE attacks)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If contains commas, double quotes, or newlines, enclose in double quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates CSV content from header and row arrays
 */
export function buildCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Prompts the browser to download a CSV file
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports test cases to CSV
 */
export function exportTestCasesToCsv(testCases: TestCase[], filename = 'test-cases.csv'): void {
  const headers = [
    'Test Case ID',
    'Title',
    'Module',
    'Suite ID',
    'Priority',
    'Type',
    'Status',
    'Preconditions',
    'Test Data',
    'Steps Count',
    'Steps Summary',
    'Expected Result',
    'Tags',
    'Created By',
    'Created Date',
    'Updated Date',
  ];

  const rows = testCases.map((tc) => {
    const stepsSummary = tc.steps
      .map((s) => `Step ${s.stepNumber}: ${s.action} -> Expected: ${s.expectedResult}`)
      .join(' | ');

    return [
      tc.id,
      tc.title,
      tc.module,
      tc.suiteId || 'Unassigned',
      tc.priority,
      tc.type,
      tc.status,
      tc.preconditions || '',
      tc.testData || '',
      tc.steps.length,
      stepsSummary,
      tc.expectedResult,
      tc.tags.join(', '),
      tc.createdBy,
      tc.createdAt,
      tc.updatedAt,
    ];
  });

  const csv = buildCsv(headers, rows);
  downloadCsv(filename, csv);
}

/**
 * Exports defects to CSV
 */
export function exportDefectsToCsv(defects: Defect[], filename = 'defects.csv'): void {
  const headers = [
    'Defect ID',
    'Title',
    'Severity',
    'Priority',
    'Status',
    'Linked Test Case',
    'Linked Test Run',
    'Environment',
    'Build Version',
    'Reporter',
    'Assignee',
    'Description',
    'Steps to Reproduce',
    'Expected Result',
    'Actual Result',
    'Resolution Notes',
    'Created Date',
    'Updated Date',
  ];

  const rows = defects.map((d) => [
    d.id,
    d.title,
    d.severity,
    d.priority,
    d.status,
    d.linkedTestCaseId || 'N/A',
    d.linkedTestRunId || 'N/A',
    d.environment,
    d.buildVersion,
    d.reporter,
    d.assignee || 'Unassigned',
    d.description,
    d.stepsToReproduce,
    d.expectedResult,
    d.actualResult,
    d.resolutionNotes || '',
    d.createdAt,
    d.updatedAt,
  ]);

  const csv = buildCsv(headers, rows);
  downloadCsv(filename, csv);
}

/**
 * Exports test run execution results to CSV
 */
export function exportExecutionsToCsv(
  runName: string,
  executions: (TestExecution & { testCaseTitle?: string; module?: string })[],
  filename = 'test-run-executions.csv'
): void {
  const headers = [
    'Execution ID',
    'Run Name',
    'Test Case ID',
    'Test Case Title',
    'Module',
    'Result',
    'Actual Result',
    'Execution Notes',
    'Executed By',
    'Executed At',
    'Linked Defects',
  ];

  const rows = executions.map((e) => [
    e.id,
    runName,
    e.testCaseId,
    e.testCaseTitle || '',
    e.module || '',
    e.result,
    e.actualResult || '',
    e.executionNotes || '',
    e.executedBy || '',
    e.executedAt || '',
    (e.linkedDefectIds || []).join(', '),
  ]);

  const csv = buildCsv(headers, rows);
  downloadCsv(filename, csv);
}

/**
 * Exports a summary report to CSV
 */
export function exportReportSummaryToCsv(
  summaryData: {
    projectName: string;
    generatedAt: string;
    totalCases: number;
    totalRuns: number;
    totalExecutions: number;
    passedCount: number;
    failedCount: number;
    blockedCount: number;
    notRunCount: number;
    passRate: string;
    completionRate: string;
    openDefects: number;
    criticalHighDefects: number;
  },
  filename = 'qa-summary-report.csv'
): void {
  const headers = ['Metric', 'Value', 'Definition / Context'];
  const rows = [
    ['Project Name', summaryData.projectName, 'Active QA project'],
    ['Generated At', summaryData.generatedAt, 'Report generation timestamp'],
    ['Total Test Cases', summaryData.totalCases, 'All defined test cases'],
    ['Total Test Runs', summaryData.totalRuns, 'Total test execution cycles'],
    ['Total Executions', summaryData.totalExecutions, 'All recorded test executions'],
    ['Passed Executions', summaryData.passedCount, 'Tests marked Passed'],
    ['Failed Executions', summaryData.failedCount, 'Tests marked Failed'],
    ['Blocked Executions', summaryData.blockedCount, 'Tests blocked by external bug or environment'],
    ['Not Run Executions', summaryData.notRunCount, 'Tests scheduled but not yet executed'],
    ['Pass Rate', summaryData.passRate, 'Passed / (Passed + Failed) * 100'],
    ['Execution Completion', summaryData.completionRate, '(Passed + Failed + Blocked) / Total * 100'],
    ['Total Open Defects', summaryData.openDefects, 'Defects in Open, In Progress, or Reopened status'],
    ['Critical/High Defects', summaryData.criticalHighDefects, 'Defects with Critical or High severity'],
  ];

  const csv = buildCsv(headers, rows);
  downloadCsv(filename, csv);
}
