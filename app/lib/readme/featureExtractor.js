/**
 * Feature Extractor
 *
 * Infers repository features and architecture patterns
 * from scanned code and detected smells.
 */

/**
 * Extract features from scan data
 *
 * @param {Object} scan - Scan results from codeScanner
 * @returns {Object} Detected features and patterns
 */
export function extractFeatures(scan = {}) {
  const features = {
    hasAPI: false,
    hasComponents: false,
    hasAuthentication: false,
    hasDatabase: false,
    hasTests: false,
    hasTypeScript: false,
    hasReact: false,
    hasNextJS: false,
    isMonolith: false,
    isFullStack: false,
    architecturePattern: null,
  };

  if (!scan.files || !Array.isArray(scan.files)) {
    return features;
  }

  const filePaths = scan.files.map((f) => f.path);
  const fileContents = new Map(); // Would be populated in real scenario

  // Detect patterns from file structure
  features.hasAPI = filePaths.some((p) =>
    /\/api\/|\/routes\/|\.route\.(ts|js|tsx|jsx)$/.test(p),
  );

  features.hasComponents = filePaths.some((p) =>
    /\/components\/|\/comp\/|\.component\.(ts|js|tsx|jsx)$/.test(p),
  );

  features.hasTests = filePaths.some((p) =>
    /\.test\.|\.spec\.|__tests__/.test(p),
  );

  features.hasTypeScript = filePaths.some((p) => /\.(ts|tsx)$/.test(p));

  features.hasReact =
    filePaths.some((p) => /\.(jsx|tsx)$/.test(p)) ||
    scan.metadata?.language === "TypeScript" ||
    JSON.stringify(scan.smells).includes("React");

  features.hasNextJS = filePaths.some((p) =>
    /\/app\/|\/pages\/|next\.config/.test(p),
  );

  features.hasAuthentication = filePaths.some((p) =>
    /auth|login|user|session|token/.test(p),
  );

  features.hasDatabase = filePaths.some((p) =>
    /database|db|model|schema|migration|query/.test(p),
  );

  // Determine architecture pattern
  if (features.hasAPI && features.hasComponents) {
    features.isFullStack = true;
    features.architecturePattern = "Full Stack";
  } else if (features.hasAPI && !features.hasComponents) {
    features.architecturePattern = "Backend API";
  } else if (features.hasComponents && !features.hasAPI) {
    features.architecturePattern = "Frontend";
  }

  // Detect monolith
  if (
    filePaths.length > 20 &&
    !filePaths.some((p) => /\/services\/|\/modules\/|microservices/.test(p))
  ) {
    features.isMonolith = true;
  }

  return features;
}

/**
 * Generate feature description
 */
export function describeFeatures(features = {}) {
  const descriptions = [];

  if (features.hasAPI) {
    descriptions.push("REST/GraphQL API endpoints");
  }
  if (features.hasComponents) {
    descriptions.push("Reusable UI components");
  }
  if (features.hasReact) {
    descriptions.push("React-based frontend");
  }
  if (features.hasNextJS) {
    descriptions.push("Next.js framework");
  }
  if (features.hasTypeScript) {
    descriptions.push("TypeScript support");
  }
  if (features.hasAuthentication) {
    descriptions.push("User authentication");
  }
  if (features.hasDatabase) {
    descriptions.push("Database integration");
  }
  if (features.hasTests) {
    descriptions.push("Automated testing");
  }
  if (features.isFullStack) {
    descriptions.push("Full-stack application");
  }

  return descriptions;
}

/**
 * Calculate feature completeness score
 */
export function getFeatureCompleteness(features = {}) {
  let score = 0;
  const maxPoints = 9;

  if (features.hasAPI) score++;
  if (features.hasComponents) score++;
  if (features.hasTests) score++;
  if (features.hasTypeScript) score++;
  if (features.hasAuthentication) score++;
  if (features.hasDatabase) score++;
  if (features.hasReact) score++;
  if (features.hasNextJS) score++;
  if (features.isFullStack) score++;

  return {
    score,
    maxScore: maxPoints,
    percentage: Math.round((score / maxPoints) * 100),
  };
}
