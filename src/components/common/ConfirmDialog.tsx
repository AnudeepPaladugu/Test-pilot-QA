/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  extraOptionLabel?: string;
  onExtraOption?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  extraOptionLabel,
  onExtraOption,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
          {message}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>

          {extraOptionLabel && onExtraOption && (
            <button
              type="button"
              onClick={onExtraOption}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              {extraOptionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isDestructive
                ? 'bg-[#C43F50] hover:bg-[#A93343]'
                : 'bg-[#3767D5] hover:bg-[#2852B8]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
