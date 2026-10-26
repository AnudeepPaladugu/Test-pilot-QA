# TestPilot QA - Test Case Management Web Application

**TestPilot QA** is a complete, production-grade manual QA Test Case Management web application designed for test architects, QA engineers, and software testing teams. It demonstrates practical workflows for test design, suite organization, interactive test run execution, defect triage, and quality reporting.

---

## 1. Core Features

### 📁 Project Management
- Complete project CRUD with custom keys (2–10 uppercase alphanumeric, e.g., `SHOP`, `AUTH`).
- Environment tracking (`Development`, `QA`, `Staging`, `Production`, `Custom`).
- Active project switcher with quick-access context.
- Archive and restore projects with safe deletion protections preventing accidental test artifact loss.

### 📝 Test Case Management
- Rich metadata: ID (`TC-0001`), Title, Preconditions, Test Data, Expected Results, Priority (`Critical`, `High`, `Medium`, `Low`), Type (`Functional`, `UI`, `Regression`, `Smoke`, `Negative`, `Validation`, etc.), and Status (`Ready`, `Draft`, `Deprecated`).
- **Dynamic Step-by-Step Builder**: Add, edit, remove, and reorder steps with individual actions and expected results.
- Sequential ID generator avoiding silent collisions.
- Full text search, multi-attribute faceted filters, and sorting.
- Multi-select actions: bulk delete, bulk assign to suite, and CSV export.
- Duplicate test case action with clean ID generation and preserved steps.

### 🗂️ Test Suites
- Group test cases by business capability or regression slice.
- Case count badges and direct navigation to filtered test cases.
- Safe suite deletion: prompts to unassign cases to prevent accidental cascade deletion.

### ⚡ Interactive Test Execution Runner
- Create test runs across environments and release builds (`TR-0001`).
- Step-through test execution runner with real-time feedback.
- Record verdicts: **Passed** (`#16845B`), **Failed** (`#C43F50`), **Blocked** (`#B7791F`), **Not Run** (`#718096`).
- Capture actual results and execution notes.
- **One-Click Linked Defect Creation**: When a test fails, click "Log Linked Defect" to automatically prefill the defect form with project, case ID, run ID, execution ID, and observed actual results.
- **Accurate Metric Calculations**:
  - `Completed = Passed + Failed + Blocked`
  - `Completion % = (Completed / Total) * 100` (returns 0% when 0 cases scheduled)
  - `Pass Rate = Passed / (Passed + Failed) * 100` (returns `N/A` when no evaluated cases)
- Completion safeguard: warns if test cases remain "Not Run" prior to finalizing.

### 🐞 Defect Management
- Track defects (`BUG-0001`) with Severity, Priority (`P1`–`P4`), and Status (`Open`, `In Progress`, `Fixed`, `Retest`, `Closed`, `Reopened`).
- Direct bidirectional links to test cases and test runs.
- Search and filter by severity, priority, and status.

### 📊 Reports & CSV Exports
- Comprehensive dashboard and dedicated analytics tab.
- Distribution bars for test executions and defect severity risk.
- **Formula-Injection Safe CSV Exports**:
  - All CSV cells starting with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically sanitized.
  - Export Test Cases, Test Run Executions, Defects, and Project Summary Reports.

### 🔒 Dual Storage Architecture (Demo Mode + Cloud Firestore)
- **Out-of-the-Box Local Demo Mode**: Preloaded with realistic seed data for an enterprise E-Commerce platform (`ShopSphere`) and SSO provider (`CloudAuth`), persisting locally in browser `localStorage`.
- **Firebase Cloud Firestore Integration Layer**: Ready for connection without exposing backend credentials in the browser bundle.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons.
- **Database & Auth (Optional Cloud)**: Firebase Authentication (Google Sign-In), Cloud Firestore client SDK.
- **Persistence (Default Local)**: LocalStorageService with realistic seed data, JSON backup/restore, and reset capability.
- **Design System**: Tailored SaaS dashboard theme adhering to anti-slop guidelines, clean typography (Plus Jakarta Sans & JetBrains Mono), and WCAG AA contrast.

---

## 3. Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Build for production
npm run build

# 4. Run type checks and linter
npm run lint
```

---

## 4. Cloud Database & Firebase Configuration

To enable Cloud Firestore synchronization:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Project Settings > General > Your Apps**, create a Web Application (`</>`).
3. Copy the `firebaseConfig` object containing:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `appId`
4. In **TestPilot QA**, navigate to **Settings & Cloud DB**.
5. Paste your config into the Firebase Web Config box and click **Save & Initialize Firebase**.
6. Under **Firebase Console > Authentication > Sign-in method**, enable **Google** provider.
7. Add your application domain to **Authorized Domains** in Firebase Authentication settings.

### Firestore Security Rules
Deploy the included `firestore.rules` to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

Or copy the rules directly from the **Settings & Cloud DB** page in the application.

---

## 5. Security & Isolation

- **Zero Secrets in Client**: No Firebase Admin credentials or private service accounts are included in the bundle.
- **Multi-Tenant Isolation**: Records are partitioned under `users/{uid}/projects/{projectId}/...`.
- **CSV Formula Injection Prevention**: Leading characters (`=`, `+`, `-`, `@`) are prefixed with single quotes per OWASP recommendations.

---

## 6. Portfolio Demonstration Guide

To demonstrate the application:
1. **Dashboard**: Observe calculated pass rates and execution distributions.
2. **Project Switcher**: Switch from "ShopSphere E-Commerce" to "CloudAuth SSO" in the top bar to verify workspace isolation.
3. **Interactive Test Runner**: Go to **Test Runs**, open `TR-0001`, change a test verdict, and observe instant progress updates.
4. **Log Linked Defect**: Mark a test as "Failed" and click "Log Linked Defect". Notice how the defect form is prefilled with step information.
5. **CSV Export**: Click "Export CSV" on the Test Cases or Reports page to verify exported spreadsheets.
