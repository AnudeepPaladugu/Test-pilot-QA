/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExecutionResult, Priority, DefectSeverity, DefectStatus, TestCaseStatus, RunStatus } from '../../types/qa';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '', variant = 'neutral' }) => {
  const variantStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const ResultBadge: React.FC<{ result: ExecutionResult }> = ({ result }) => {
  switch (result) {
    case 'Passed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#16845B]/10 text-[#16845B] border border-[#16845B]/25">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16845B]" />
          Passed
        </span>
      );
    case 'Failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#C43F50]/10 text-[#C43F50] border border-[#C43F50]/25">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C43F50]" />
          Failed
        </span>
      );
    case 'Blocked':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/25">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F]" />
          Blocked
        </span>
      );
    case 'Not Run':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-[#718096]/10 text-[#718096] border border-[#718096]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#718096]" />
          Not Run
        </span>
      );
  }
};

export const PriorityBadge: React.FC<{ priority: Priority | DefectSeverity }> = ({ priority }) => {
  switch (priority) {
    case 'Critical':
      return <Badge variant="danger">Critical</Badge>;
    case 'High':
      return <Badge variant="warning">High</Badge>;
    case 'Medium':
      return <Badge variant="info">Medium</Badge>;
    case 'Low':
    default:
      return <Badge variant="neutral">Low</Badge>;
  }
};

export const StatusBadge: React.FC<{ status: DefectStatus | TestCaseStatus | RunStatus | string }> = ({
  status,
}) => {
  switch (status) {
    case 'Ready':
    case 'Completed':
    case 'Fixed':
    case 'Closed':
      return <Badge variant="success">{status}</Badge>;
    case 'In Progress':
    case 'Retest':
    case 'Draft':
      return <Badge variant="info">{status}</Badge>;
    case 'Open':
    case 'Reopened':
      return <Badge variant="danger">{status}</Badge>;
    case 'Planned':
    case 'Deprecated':
    case 'Cancelled':
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
