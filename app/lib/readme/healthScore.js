/**
 * Repository Health Score
 *
 * Calculates overall repository health based on code quality metrics
 * and detected smells.
 */

/**
 * Calculate health score (0-100)
 *
 * @param {Object} scan - Scan results
 * @returns {Object} Health score breakdown
 */
export function calculateHealthScore(scan = {}) {
  let score = 100;
  const breakdown = {
    baseScore: 100,
    codeQuality: 20,
    security: 0,
    reliability: 0,
    performance: 0,
    maintainability: 0,
    finalScore: 0,
  };

  if (!scan.smells || !Array.isArray(scan.smells)) {
    breakdown.finalScore = score;
    return breakdown;
  }

  const smells = scan.smells || [];
  const categories = {
    security: [],
    reliability: [],
    performance: [],
    maintainability: [],
  };

  // Categorize smells
  smells.forEach((smell) => {
    const category = smell.category || "unknown";
    if (categories[category]) {
      categories[category].push(smell);
    }
  });

  // Security (most critical)
  breakdown.security = calculateCategoryScore(categories.security, 30);

  // Reliability
  breakdown.reliability = calculateCategoryScore(categories.reliability, 25);

  // Performance
  breakdown.performance = calculateCategoryScore(categories.performance, 15);

  // Maintainability
  breakdown.maintainability = calculateCategoryScore(
    categories.maintainability,
    10,
  );

  // Calculate final score
  breakdown.finalScore = Math.max(
    0,
    breakdown.baseScore -
      (breakdown.security +
        breakdown.reliability +
        breakdown.performance +
        breakdown.maintainability),
  );

  return breakdown;
}

/**
 * Calculate score deduction for a category
 */
function calculateCategoryScore(smells, maxDeduction) {
  if (smells.length === 0) return 0;

  const severityWeights = {
    high: 3,
    medium: 2,
    low: 1,
  };

  let totalWeight = 0;
  smells.forEach((smell) => {
    totalWeight += severityWeights[smell.severity] || 1;
  });

  // Deduct proportionally, capped at maxDeduction
  return Math.min(maxDeduction, totalWeight * 2);
}

/**
 * Get health score grade (A-F)
 */
export function getHealthGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Get health status description
 */
export function getHealthStatus(score) {
  if (score >= 90) {
    return {
      status: "Excellent",
      emoji: "🟢",
      description: "Well-maintained codebase with minimal issues",
    };
  }
  if (score >= 75) {
    return {
      status: "Good",
      emoji: "🟢",
      description: "Solid codebase with minor improvements needed",
    };
  }
  if (score >= 60) {
    return {
      status: "Fair",
      emoji: "🟡",
      description: "Several issues should be addressed",
    };
  }
  return {
    status: "Poor",
    emoji: "🔴",
    description: "Significant code quality and maintenance issues",
  };
}

/**
 * Generate health summary
 */
export function generateHealthSummary(scan = {}) {
  const scoreData = calculateHealthScore(scan);
  const status = getHealthStatus(scoreData.finalScore);
  const grade = getHealthGrade(scoreData.finalScore);

  return {
    ...scoreData,
    grade,
    status: status.status,
    emoji: status.emoji,
    description: status.description,
  };
}
