const severityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    warning: 2,
    low: 3,
    info: 3,
};
function clampSeverity(value) {
    const s = (value || '').toLowerCase();
    if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low')
        return s;
    if (s === 'warning' || s === 'error')
        return 'medium';
    return 'low';
}
export function sortBySeverity(items) {
    return [...items].sort((a, b) => {
        var _a, _b;
        const sa = (_a = severityOrder[(a.severity || '').toLowerCase()]) !== null && _a !== void 0 ? _a : 99;
        const sb = (_b = severityOrder[(b.severity || '').toLowerCase()]) !== null && _b !== void 0 ? _b : 99;
        return sa - sb;
    });
}
export function dedupeFindings(items) {
    const seen = new Set();
    return items.filter((item) => {
        const key = [
            (item.fileName || 'unknown').toLowerCase(),
            Number(item.line || 1),
            (item.severity || 'low').toLowerCase(),
            (item.explanation || '').trim().toLowerCase(),
            (item.suggestedFix || '').trim().toLowerCase(),
        ].join('|');
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
export function normalizeCodeSmellRow(row) {
    const rule = (row === null || row === void 0 ? void 0 : row.rule_id) ? ` (${row.rule_id})` : '';
    return {
        id: String((row === null || row === void 0 ? void 0 : row.id) || crypto.randomUUID()),
        fileName: (row === null || row === void 0 ? void 0 : row.file_path) || 'unknown',
        line: Number((row === null || row === void 0 ? void 0 : row.line) || 1),
        severity: clampSeverity(row === null || row === void 0 ? void 0 : row.severity),
        explanation: (row === null || row === void 0 ? void 0 : row.message) || `Code smell detected${rule}`,
        suggestedFix: (row === null || row === void 0 ? void 0 : row.suggested_fix) ||
            `Refactor the flagged block${rule} into smaller, testable units and remove duplicated logic.`,
        source: 'db',
    };
}
export function normalizeBugRow(row) {
    var _a;
    const score = Number((_a = row === null || row === void 0 ? void 0 : row.confidence_score) !== null && _a !== void 0 ? _a : 0.5);
    const severity = score >= 0.85 ? 'high' : score >= 0.6 ? 'medium' : 'low';
    return {
        id: String((row === null || row === void 0 ? void 0 : row.id) || crypto.randomUUID()),
        fileName: (row === null || row === void 0 ? void 0 : row.file_path) || 'unknown',
        line: Number((row === null || row === void 0 ? void 0 : row.line) || 1),
        severity,
        explanation: (row === null || row === void 0 ? void 0 : row.description) || 'Potential bug detected.',
        suggestedFix: (row === null || row === void 0 ? void 0 : row.suggested_fix) ||
            'Add input validation, guard edge cases, and include a focused unit test for this execution path.',
        source: 'db',
    };
}
export function normalizeSecurityRow(row) {
    const issueType = (row === null || row === void 0 ? void 0 : row.issue_type) ? ` (${row.issue_type})` : '';
    return {
        id: String((row === null || row === void 0 ? void 0 : row.id) || crypto.randomUUID()),
        fileName: (row === null || row === void 0 ? void 0 : row.file_path) || 'unknown',
        line: Number((row === null || row === void 0 ? void 0 : row.line) || 1),
        severity: clampSeverity(row === null || row === void 0 ? void 0 : row.severity),
        explanation: (row === null || row === void 0 ? void 0 : row.description) || `Security issue detected${issueType}`,
        suggestedFix: (row === null || row === void 0 ? void 0 : row.remediation) ||
            (row === null || row === void 0 ? void 0 : row.suggested_fix) ||
            `Apply secure-by-default controls and patch the vulnerable logic${issueType}.`,
        source: 'db',
    };
}
export function findingsFromSnapshot(metrics, key) {
    var _a;
    const raw = (_a = metrics === null || metrics === void 0 ? void 0 : metrics.findings) === null || _a === void 0 ? void 0 : _a[key];
    if (!Array.isArray(raw))
        return [];
    return raw.map((f, idx) => ({
        id: String((f === null || f === void 0 ? void 0 : f.id) || `snapshot-${key}-${idx}`),
        fileName: (f === null || f === void 0 ? void 0 : f.fileName) || (f === null || f === void 0 ? void 0 : f.file_path) || 'unknown',
        line: Number((f === null || f === void 0 ? void 0 : f.line) || 1),
        severity: clampSeverity(f === null || f === void 0 ? void 0 : f.severity),
        explanation: (f === null || f === void 0 ? void 0 : f.explanation) || (f === null || f === void 0 ? void 0 : f.message) || 'Issue detected during AI analysis.',
        suggestedFix: (f === null || f === void 0 ? void 0 : f.suggestedFix) || (f === null || f === void 0 ? void 0 : f.suggested_fix) || 'Apply the recommended refactor and validate with tests.',
        source: 'snapshot',
    }));
}
