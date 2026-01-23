/**
 * Tech Stack Mapper
 *
 * Infers technology stack from imports and detected patterns.
 * Extracts frameworks, libraries, and tools from scan data.
 */

/**
 * Extract tech stack from scanned files
 *
 * @param {Array<Object>} files - Scanned files with content
 * @param {Object} metadata - Repository metadata
 * @returns {Object}
 *   {
 *     frontend: Array, backend: Array, databases: Array,
 *     tools: Array, languages: Array
 *   }
 */
export function extractTechStack(files = [], metadata = {}) {
  const stack = {
    frontend: new Set(),
    backend: new Set(),
    databases: new Set(),
    tools: new Set(),
    languages: new Set(),
  };

  // Add primary language from metadata
  if (metadata.language && metadata.language !== "Unknown") {
    stack.languages.add(metadata.language);
  }

  // Analyze imports from scanned files
  files.forEach((file) => {
    if (file.metrics?.imports) {
      analyzeImports(file.metrics.imports, stack);
    }
  });

  // Convert Sets to sorted Arrays
  return {
    frontend: Array.from(stack.frontend).sort(),
    backend: Array.from(stack.backend).sort(),
    databases: Array.from(stack.databases).sort(),
    tools: Array.from(stack.tools).sort(),
    languages: Array.from(stack.languages).sort(),
  };
}

/**
 * Analyze imports to detect libraries
 */
function analyzeImports(imports, stack) {
  const patterns = {
    frontend: [
      /react/i,
      /vue/i,
      /angular/i,
      /svelte/i,
      /next/i,
      /gatsby/i,
      /nuxt/i,
      /jquery/i,
      /bootstrap/i,
      /tailwind/i,
      /material-ui|@mui/i,
    ],
    backend: [
      /express/i,
      /fastify/i,
      /hapi/i,
      /koa/i,
      /nest/i,
      /apollo/i,
      /graphql/i,
      /restify/i,
    ],
    databases: [
      /mongodb|mongoose/i,
      /postgres|pg/i,
      /mysql/i,
      /sqlite/i,
      /redis/i,
      /firebase/i,
      /dynamodb/i,
      /cosmos/i,
    ],
    tools: [
      /webpack/i,
      /vite/i,
      /rollup/i,
      /jest/i,
      /mocha/i,
      /cypress/i,
      /eslint/i,
      /prettier/i,
      /docker/i,
    ],
  };

  imports.forEach((imp) => {
    Object.entries(patterns).forEach(([category, patterns]) => {
      patterns.forEach((pattern) => {
        if (pattern.test(imp)) {
          const tech = extractTechName(imp);
          stack[category].add(tech);
        }
      });
    });
  });
}

/**
 * Extract clean tech name from import
 */
function extractTechName(importStr) {
  // Extract package name from various import formats
  const match = importStr.match(/^(@?[\w\-]+(?:\/[\w\-]+)?)/);
  if (match) {
    return match[1]
      .split("/")
      .pop()
      .replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  }
  return importStr;
}

/**
 * Merge tech stacks (for multiple branches/versions)
 */
export function mergeTechStacks(...stacks) {
  const merged = {
    frontend: new Set(),
    backend: new Set(),
    databases: new Set(),
    tools: new Set(),
    languages: new Set(),
  };

  stacks.forEach((stack) => {
    if (stack) {
      Object.keys(merged).forEach((key) => {
        if (Array.isArray(stack[key])) {
          stack[key].forEach((item) => merged[key].add(item));
        }
      });
    }
  });

  return {
    frontend: Array.from(merged.frontend).sort(),
    backend: Array.from(merged.backend).sort(),
    databases: Array.from(merged.databases).sort(),
    tools: Array.from(merged.tools).sort(),
    languages: Array.from(merged.languages).sort(),
  };
}

/**
 * Format tech stack for display
 */
export function formatTechStack(stack) {
  const sections = [];

  if (stack.languages?.length > 0) {
    sections.push(`**Languages**: ${stack.languages.join(", ")}`);
  }
  if (stack.frontend?.length > 0) {
    sections.push(`**Frontend**: ${stack.frontend.join(", ")}`);
  }
  if (stack.backend?.length > 0) {
    sections.push(`**Backend**: ${stack.backend.join(", ")}`);
  }
  if (stack.databases?.length > 0) {
    sections.push(`**Databases**: ${stack.databases.join(", ")}`);
  }
  if (stack.tools?.length > 0) {
    sections.push(`**Tools & Build**: ${stack.tools.join(", ")}`);
  }

  return sections.join("\n\n");
}
