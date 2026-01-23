/**
 * Code Smell Rules Definition
 *
 * Defines all smell types, categories, and base severities.
 * Organized by category: Maintainability, Reliability, Performance, Security.
 */

export const SMELL_RULES = {
  // ==================== MAINTAINABILITY ====================
  LARGE_FILE: {
    id: "LARGE_FILE",
    category: "maintainability",
    baseSeverity: "medium",
    title: "Large File",
    description: "File exceeds recommended size limit",
    recommendation: "Consider splitting into smaller modules",
  },

  LARGE_FUNCTION: {
    id: "LARGE_FUNCTION",
    category: "maintainability",
    baseSeverity: "medium",
    title: "Large Function",
    description: "Function is too long and handles multiple concerns",
    recommendation: "Extract logic into smaller, focused functions",
  },

  DEEP_NESTING: {
    id: "DEEP_NESTING",
    category: "maintainability",
    baseSeverity: "medium",
    title: "Deep Nesting",
    description: "Code has excessive nesting levels",
    recommendation: "Use early returns and guard clauses",
  },

  TOO_MANY_PARAMETERS: {
    id: "TOO_MANY_PARAMETERS",
    category: "maintainability",
    baseSeverity: "medium",
    title: "Too Many Parameters",
    description: "Function has too many parameters",
    recommendation: "Use object parameter or config object",
  },

  DUPLICATE_LOGIC: {
    id: "DUPLICATE_LOGIC",
    category: "maintainability",
    baseSeverity: "medium",
    title: "Duplicated Code",
    description: "Code is duplicated in multiple places",
    recommendation: "Extract to a shared function or utility",
  },

  UNUSED_VARIABLE: {
    id: "UNUSED_VARIABLE",
    category: "maintainability",
    baseSeverity: "low",
    title: "Unused Variable",
    description: "Variable is declared but never used",
    recommendation: "Remove unused variable or use it",
  },

  UNUSED_IMPORT: {
    id: "UNUSED_IMPORT",
    category: "maintainability",
    baseSeverity: "low",
    title: "Unused Import",
    description: "Import is declared but never used",
    recommendation: "Remove unused import",
  },

  EXCESSIVE_LOGGING: {
    id: "EXCESSIVE_LOGGING",
    category: "maintainability",
    baseSeverity: "low",
    title: "Excessive Logging",
    description: "Too many console.log statements",
    recommendation: "Use proper logging library or remove debug logs",
  },

  // ==================== RELIABILITY ====================
  ASYNC_NO_TRY_CATCH: {
    id: "ASYNC_NO_TRY_CATCH",
    category: "reliability",
    baseSeverity: "high",
    title: "Missing Error Handling",
    description: "Async function without try/catch error handling",
    recommendation: "Wrap in try/catch or handle promise rejection",
  },

  PROMISE_NO_CATCH: {
    id: "PROMISE_NO_CATCH",
    category: "reliability",
    baseSeverity: "high",
    title: "Unhandled Promise",
    description: "Promise chain without .catch() handler",
    recommendation: "Add .catch() handler or use try/catch",
  },

  EMPTY_CATCH: {
    id: "EMPTY_CATCH",
    category: "reliability",
    baseSeverity: "high",
    title: "Empty Catch Block",
    description: "Catch block is empty or only logs silently",
    recommendation: "Add proper error handling or re-throw",
  },

  SILENT_ERROR_SWALLOW: {
    id: "SILENT_ERROR_SWALLOW",
    category: "reliability",
    baseSeverity: "high",
    title: "Silent Error Swallowing",
    description: "Errors are caught but not logged or handled",
    recommendation: "Log or re-throw errors appropriately",
  },

  MUTABLE_GLOBAL_STATE: {
    id: "MUTABLE_GLOBAL_STATE",
    category: "reliability",
    baseSeverity: "high",
    title: "Mutable Global State",
    description: "Code modifies global/module-level state",
    recommendation: "Use dependency injection or scoped state",
  },

  // ==================== PERFORMANCE ====================
  LARGE_REACT_COMPONENT: {
    id: "LARGE_REACT_COMPONENT",
    category: "performance",
    baseSeverity: "medium",
    title: "Large React Component",
    description: "React component file is too large",
    recommendation: "Extract logic into custom hooks or child components",
  },

  INLINE_JSX_FUNCTION: {
    id: "INLINE_JSX_FUNCTION",
    category: "performance",
    baseSeverity: "medium",
    title: "Inline JSX Function",
    description: "Function defined inline in JSX causes re-renders",
    recommendation: "Move function outside component or use useCallback",
  },

  HEAVY_SYNC_LOOP: {
    id: "HEAVY_SYNC_LOOP",
    category: "performance",
    baseSeverity: "medium",
    title: "Heavy Synchronous Loop",
    description: "Synchronous loop with heavy operations",
    recommendation: "Use batch processing or debouncing",
  },

  UNMEMOIZED_EFFECT: {
    id: "UNMEMOIZED_EFFECT",
    category: "performance",
    baseSeverity: "medium",
    title: "Unmemoized Hook Dependency",
    description: "useEffect/useMemo missing or incorrect dependency array",
    recommendation: "Add proper dependency array to hook",
  },

  EXCESSIVE_IMPORTS: {
    id: "EXCESSIVE_IMPORTS",
    category: "performance",
    baseSeverity: "low",
    title: "Excessive Imports",
    description: "Many imports from single module",
    recommendation: "Consider code splitting or tree-shaking",
  },

  // ==================== SECURITY ====================
  HARDCODED_SECRET: {
    id: "HARDCODED_SECRET",
    category: "security",
    baseSeverity: "high",
    title: "Hardcoded Secret",
    description: "API key, token, or password in source code",
    recommendation: "Move to environment variables or secrets manager",
  },

  EVAL_USAGE: {
    id: "EVAL_USAGE",
    category: "security",
    baseSeverity: "high",
    title: "Eval Usage",
    description: "Using eval() or Function() constructor",
    recommendation: "Use safer alternatives like JSON.parse or libraries",
  },

  UNSANITIZED_INPUT: {
    id: "UNSANITIZED_INPUT",
    category: "security",
    baseSeverity: "high",
    title: "Unsanitized User Input",
    description: "User input used without validation/sanitization",
    recommendation: "Validate and sanitize all user inputs",
  },

  OPEN_CORS: {
    id: "OPEN_CORS",
    category: "security",
    baseSeverity: "high",
    title: "Open CORS Policy",
    description: "CORS allows requests from any origin",
    recommendation: "Restrict CORS to specific trusted origins",
  },

  CLIENT_SIDE_SECRET: {
    id: "CLIENT_SIDE_SECRET",
    category: "security",
    baseSeverity: "high",
    title: "Secret in Client Code",
    description: "Sensitive data in browser-accessible code",
    recommendation: "Move secrets to server-side only",
  },

  SQL_INJECTION_RISK: {
    id: "SQL_INJECTION_RISK",
    category: "security",
    baseSeverity: "high",
    title: "SQL Injection Risk",
    description: "Unsanitized SQL query construction",
    recommendation: "Use parameterized queries or ORM",
  },
};

/**
 * Get smell rule by ID
 *
 * @param {string} smellId - Smell ID
 * @returns {Object|null} Smell rule or null
 */
export function getSmellRule(smellId) {
  return SMELL_RULES[smellId] || null;
}

/**
 * Get all smells in a category
 *
 * @param {string} category - Category name
 * @returns {Array<Object>} Smells in category
 */
export function getSmellsByCategory(category) {
  return Object.values(SMELL_RULES).filter(
    (rule) => rule.category === category,
  );
}

/**
 * Get all smell categories
 *
 * @returns {Array<string>} Category names
 */
export function getSmellCategories() {
  const categories = new Set();
  Object.values(SMELL_RULES).forEach((rule) => {
    categories.add(rule.category);
  });
  return Array.from(categories).sort();
}
