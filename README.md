# TestPilot QA
### Manual Test Management · Test Execution · Defect Tracking

TestPilot QA is a portfolio project exploring how manual software testing workflows can be organized in one focused workspace. It brings together test case design, reusable suites, execution runs, linked defects, and quality summaries.

> **Project status:** Work in progress. Core workflows are implemented in the local demo; cloud setup and broader validation are still being refined. This is a learning and portfolio project, not a claim of production readiness.

## Overview

The app is designed around a familiar QA cycle:

**Plan → Organize → Execute → Report → Triage**

## Current Features

### Project workspace
- Create, edit, archive, restore, and switch between projects.
- Track target environments such as Development, QA, Staging, and Production.
- Keep test artifacts associated with their project.

### Test case design
- Store preconditions, test data, expected results, priority, type, and status.
- Build and reorder step-by-step actions with expected outcomes.
- Search, filter, sort, duplicate, bulk-manage, and export cases.

### Test suites
- Group cases by feature area or regression scope.
- Review suite membership and case counts.
- Unassign cases when removing a suite to avoid unintended data loss.

### Test execution
- Set up test runs for a target environment and build.
- Record step outcomes and notes.
- Track Passed, Failed, Blocked, and Not Run statuses.
- Calculate completion and pass-rate metrics, with safeguards for unevaluated cases.

### Defect tracking
- Capture defects with severity, priority, status, and reproduction details.
- Link defects to relevant test cases and executions.
- Filter the defect list during triage.

### Reports and data handling
- Review execution and defect summaries.
- Export test cases, executions, defects, and project summaries as CSV.
- Sanitize spreadsheet-formula prefixes in CSV exports.
- Use local demo data, with an optional Firebase Authentication and Cloud Firestore integration path.

## Technology

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **UI icons:** Lucide React
- **Local persistence:** Browser local storage
- **Optional cloud storage:** Firebase Authentication and Cloud Firestore

## Run Locally

### Requirements
- Node.js and npm, or Bun
- A modern browser

### Setup

```bash
npm install
npm run dev
```

Vite starts the development server on port **3000**.

### Quality checks

```bash
npm run lint
npm run build
```

## Portfolio Walkthrough

1. Open the dashboard and review the sample project metrics.
2. Switch between the sample workspaces.
3. Open a test case and inspect its preconditions, test data, and steps.
4. Run a test and update its outcome.
5. Mark a case as failed and follow the linked-defect workflow.
6. Export a report to inspect the CSV output.

## Roadmap

- [ ] Expand automated tests for the most important QA workflows.
- [ ] Validate cloud sync and user-level data isolation with dedicated test accounts.
- [ ] Improve empty states, loading feedback, and error recovery.
- [ ] Add stronger end-to-end coverage for test execution and defect linking.
- [ ] Document deployment and backup/restore practices.

## Project Notes

The repository is intended to demonstrate practical QA thinking and a working prototype. Cloud features require your own Firebase project and configuration. Before using real or sensitive testing data, review the Firebase configuration and security rules for your deployment.

---

Built as an independent QA portfolio project by **Anudeep Paladugu**.
