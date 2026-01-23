/**
 * Severity Mapper
 *
 * Maps base severity to context-aware severity levels.
 * Adjusts severity based on file type, category, and organizational rules.
 */

/**
 * Get final severity for a smell
 *
 * @param {Object} smell - Smell object
 * @param {string} smell.id - Smell ID
 * @param {string} smell.category - Smell category
 * @param {string} smell.baseSeverity - Base severity (high/medium/low)
 * @param {string} filePath - File path context
 * @returns {string} Final severity (high/medium/low)
 */
export function mapSeverity(smell, filePath = "") {
  let severity = smell.severity || smell.baseSeverity || "low";

  // Amplify severity in critical files
  if (isCriticalPath(filePath)) {
    if (severity === "low") severity = "medium";
    else if (severity === "medium") severity = "high";
  }

  // Security issues are always high
  if (smell.category === "security") {
    severity = "high";
  }

  // Reliability in API routes is critical
  if (
    (smell.category === "reliability" || smell.id === "ASYNC_NO_TRY_CATCH") &&
    filePath.includes("/api/")
  ) {
    severity = "high";
  }

  return severity;
}

/**
 * Check if file path is critical
 */
function isCriticalPath(filePath) {
  const critical = ["/api/", "/auth/", "/database/", "/lib/"];
  return critical.some((path) => filePath.includes(path));
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity) {
  switch (severity) {
    case "high":
      return "#dc3545"; // red
    case "medium":
      return "#ff9800"; // orange
    case "low":
      return "#ffc107"; // yellow
    default:
      return "#6c757d"; // gray
  }
}

/**
 * Get severity emoji
 */
export function getSeverityEmoji(severity) {
  switch (severity) {
    case "high":
      return "🔴";
    case "medium":
      return "🟠";
    case "low":
      return "🟡";
    default:
      return "⚪";
  }
}

/**
 * Sort smells by severity
 */
export function sortBySeverity(smells) {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return [...smells].sort((a, b) => {
    const aOrder = severityOrder[a.severity] ?? 3;
    const bOrder = severityOrder[b.severity] ?? 3;
    return aOrder - bOrder;
  });
}

/**
 * Filter smells by severity threshold
 */
export function filterBySeverity(smells, minSeverity = "low") {
  const severityRank = { high: 3, medium: 2, low: 1 };
  const threshold = severityRank[minSeverity] || 0;

  return smells.filter((smell) => {
    const rank = severityRank[smell.severity] || 0;
    return rank >= threshold;
  });
}
