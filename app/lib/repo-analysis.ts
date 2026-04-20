export type NormalizedFinding = {
  id: string;
  fileName: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  suggestedFix: string;
  source: 'db' | 'snapshot';
};

const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  warning: 2,
  low: 3,
  info: 3,
};

function clampSeverity(value: string | null | undefined): NormalizedFinding['severity'] {
  const s = (value || '').toLowerCase();
  if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low') return s;
  if (s === 'warning' || s === 'error') return 'medium';
  return 'low';
}

export function sortBySeverity<T extends { severity?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const sa = severityOrder[(a.severity || '').toLowerCase()] ?? 99;
    const sb = severityOrder[(b.severity || '').toLowerCase()] ?? 99;
    return sa - sb;
  });
}

export function normalizeCodeSmellRow(row: any): NormalizedFinding {
  const rule = row?.rule_id ? ` (${row.rule_id})` : '';
  return {
    id: String(row?.id || crypto.randomUUID()),
    fileName: row?.file_path || 'unknown',
    line: Number(row?.line || 1),
    severity: clampSeverity(row?.severity),
    explanation: row?.message || `Code smell detected${rule}`,
    suggestedFix:
      row?.suggested_fix ||
      `Refactor the flagged block${rule} into smaller, testable units and remove duplicated logic.`,
    source: 'db',
  };
}

export function normalizeBugRow(row: any): NormalizedFinding {
  const score = Number(row?.confidence_score ?? 0.5);
  const severity = score >= 0.85 ? 'high' : score >= 0.6 ? 'medium' : 'low';
  return {
    id: String(row?.id || crypto.randomUUID()),
    fileName: row?.file_path || 'unknown',
    line: Number(row?.line || 1),
    severity,
    explanation: row?.description || 'Potential bug detected.',
    suggestedFix:
      row?.suggested_fix ||
      'Add input validation, guard edge cases, and include a focused unit test for this execution path.',
    source: 'db',
  };
}

export function normalizeSecurityRow(row: any): NormalizedFinding {
  const issueType = row?.issue_type ? ` (${row.issue_type})` : '';
  return {
    id: String(row?.id || crypto.randomUUID()),
    fileName: row?.file_path || 'unknown',
    line: Number(row?.line || 1),
    severity: clampSeverity(row?.severity),
    explanation: row?.description || `Security issue detected${issueType}`,
    suggestedFix:
      row?.remediation ||
      row?.suggested_fix ||
      `Apply secure-by-default controls and patch the vulnerable logic${issueType}.`,
    source: 'db',
  };
}

export function findingsFromSnapshot(metrics: any, key: 'code_smells' | 'bugs' | 'security_issues'): NormalizedFinding[] {
  const raw = metrics?.findings?.[key];
  if (!Array.isArray(raw)) return [];

  return raw.map((f: any, idx: number) => ({
    id: String(f?.id || `snapshot-${key}-${idx}`),
    fileName: f?.fileName || f?.file_path || 'unknown',
    line: Number(f?.line || 1),
    severity: clampSeverity(f?.severity),
    explanation: f?.explanation || f?.message || 'Issue detected during AI analysis.',
    suggestedFix: f?.suggestedFix || f?.suggested_fix || 'Apply the recommended refactor and validate with tests.',
    source: 'snapshot',
  }));
}
