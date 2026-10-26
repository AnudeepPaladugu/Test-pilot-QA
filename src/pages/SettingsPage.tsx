/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { FirebaseConfigInput } from '../types/qa';
import {
  Database,
  Cloud,
  ShieldCheck,
  Download,
  Upload,
  RotateCcw,
  LogIn,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Check,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    storageMode,
    storageModeName,
    isCloudConnected,
    firebaseUser,
    configureFirebase,
    clearFirebaseConfig,
    signInWithGoogle,
    signOutCurrentUser,
    resetDemoData,
    exportBackupJson,
    importBackupJson,
    showToast,
  } = useStorage();

  // Firebase Form
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [appId, setAppId] = useState('');
  const [rawConfigJson, setRawConfigJson] = useState('');

  // Backup Import Form
  const [importJsonText, setImportJsonText] = useState('');
  const [copiedRules, setCopiedRules] = useState(false);

  const handleConnectFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    let config: FirebaseConfigInput;

    if (rawConfigJson.trim()) {
      try {
        const parsed = JSON.parse(rawConfigJson);
        config = {
          apiKey: parsed.apiKey || '',
          authDomain: parsed.authDomain || '',
          projectId: parsed.projectId || '',
          storageBucket: parsed.storageBucket || '',
          messagingSenderId: parsed.messagingSenderId || '',
          appId: parsed.appId || '',
        };
      } catch (err) {
        showToast('Invalid JSON in Firebase config snippet.', 'error');
        return;
      }
    } else {
      if (!apiKey || !projectId) {
        showToast('API Key and Project ID are required.', 'error');
        return;
      }
      config = {
        apiKey: apiKey.trim(),
        authDomain: authDomain.trim(),
        projectId: projectId.trim(),
        storageBucket: storageBucket.trim(),
        appId: appId.trim(),
      };
    }

    const success = configureFirebase(config);
    if (success) {
      showToast('Firebase client initialized. Sign in to sync data to Firestore.', 'success');
    }
  };

  const handleExportBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `testpilot-qa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported complete JSON backup.', 'success');
  };

  const handleImportBackup = () => {
    if (!importJsonText.trim()) {
      showToast('Please paste valid JSON data to restore.', 'error');
      return;
    }
    importBackupJson(importJsonText);
    setImportJsonText('');
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Strict User Workspace Isolation
    // Only authenticated users can access their own projects and test artifacts
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /projects/{projectId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /testSuites/{suiteId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        match /testCases/{caseId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        match /testRuns/{runId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        match /executions/{executionId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        match /defects/{defectId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    
    // Deny all other public access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

  const copyRulesToClipboard = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
    showToast('Copied firestore.rules to clipboard.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Settings & Cloud Database
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage storage mode, Firebase Cloud Firestore integration, security rules, and data backups.
        </p>
      </div>

      {/* Storage Mode Status Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${
                isCloudConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Current Storage: {storageModeName}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    isCloudConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isCloudConnected ? 'Cloud Synced' : 'In-Browser Persistence'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                {isCloudConnected
                  ? `Connected to Firebase Cloud Firestore for user ${firebaseUser?.email || firebaseUser?.uid}. All records are securely isolated to your workspace.`
                  : 'Currently storing all projects, test cases, executions, and defects locally inside browser localStorage. Changes persist across browser refreshes and tabs.'}
              </p>
            </div>
          </div>

          {storageMode === 'firebase' && (
            <button
              onClick={clearFirebaseConfig}
              className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Revert to Demo Mode
            </button>
          )}
        </div>

        {/* User Auth Info (if Firebase) */}
        {storageMode === 'firebase' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              {firebaseUser ? (
                <span>
                  Signed in as: <strong>{firebaseUser.displayName || firebaseUser.email}</strong>
                </span>
              ) : (
                <span className="text-amber-700">
                  Firebase configured, but user is not signed in. Sign in with Google to sync Firestore.
                </span>
              )}
            </div>

            {firebaseUser ? (
              <button
                onClick={signOutCurrentUser}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cloud Firestore Integration Setup */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#3767D5]" />
            <span>Connect Your Firebase Cloud Firestore Project</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            To synchronize tests with a persistent Cloud Firestore database, paste your Firebase web client configuration snippet below:
          </p>
        </div>

        <form onSubmit={handleConnectFirebase} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Option A: Paste Firebase Web Config Object (JSON)
            </label>
            <textarea
              value={rawConfigJson}
              onChange={(e) => setRawConfigJson(e.target.value)}
              rows={3}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-project.firebaseapp.com",\n  "projectId": "my-project",\n  "appId": "1:..."\n}`}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3767D5]/20 focus:border-[#3767D5]"
            />
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-px bg-slate-200 flex-1" />
            <span className="text-[10px] font-semibold uppercase">Or Enter Fields Manually</span>
            <span className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#3767D5]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Project ID</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-qa-project-123"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#3767D5]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Auth Domain</label>
              <input
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="my-qa-project-123.firebaseapp.com"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#3767D5]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:123456789:web:abcdef"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#3767D5]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-[#3767D5] hover:bg-[#2852B8] rounded-lg transition-colors shadow-xs"
            >
              Save & Initialize Firebase
            </button>
          </div>
        </form>
      </div>

      {/* Firestore Security Rules Display */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Firestore Security Rules (firestore.rules)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict multi-tenant security rules enforcing authenticated ownership under users/{'{'}uid{'}'}.
            </p>
          </div>

          <button
            onClick={copyRulesToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed">
          {firestoreRulesText}
        </pre>
      </div>

      {/* Data Backup & Demo Data Management */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Data Management & Offline Backups</h3>
          <p className="text-xs text-slate-500 mt-1">
            Export full workspace snapshot to JSON, restore from backup, or reset to realistic seed data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-semibold text-xs text-slate-800">Export JSON Backup</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download all projects, suites, test cases, runs, executions, and defects as a single JSON file.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-semibold text-xs text-slate-800">Reset Demo Data</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Restore the sample ShopSphere and CloudAuth QA projects and executions.
              </p>
            </div>
            <button
              onClick={resetDemoData}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Sample Data</span>
            </button>
          </div>
        </div>

        {/* Restore Backup Form */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Restore Backup from JSON
          </label>
          <div className="flex gap-2">
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={2}
              placeholder="Paste previously exported backup JSON here..."
              className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#3767D5]"
            />
            <button
              onClick={handleImportBackup}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
