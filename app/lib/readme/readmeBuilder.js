/**
 * README Builder
 *
 * Assembles final README.md from scan data, detected features,
 * tech stack, and health metrics.
 *
 * README content is DERIVED from scan data only - no fluff.
 */

import { extractTechStack, formatTechStack } from "./techStackMapper.js";
import { extractFeatures, describeFeatures } from "./featureExtractor.js";
import { generateHealthSummary } from "./healthScore.js";

/**
 * Build README from scan results
 *
 * @param {Object} scan - Scan results from codeScanner
 * @returns {string} Markdown README content
 */
export function buildReadme(scan = {}) {
  const sections = [];

  // Header with project info
  sections.push(generateHeader(scan));

  // Features (derived from code)
  const features = extractFeatures(scan);
  sections.push(generateFeaturesSection(features));

  // Tech Stack (inferred from imports)
  const techStack = extractTechStack(scan.files, scan.metadata);
  sections.push(generateTechStackSection(techStack));

  // Architecture
  sections.push(generateArchitectureSection(scan, features));

  // Code Quality
  sections.push(generateQualitySection(scan));

  // Security Status
  if (hasSecurityIssues(scan)) {
    sections.push(generateSecuritySection(scan));
  }

  // Performance
  if (hasPerformanceIssues(scan)) {
    sections.push(generatePerformanceSection(scan));
  }

  // Folder Structure
  sections.push(generateStructureSection(scan));

  // Getting Started
  sections.push(generateGettingStartedSection(scan));

  // TODOs / Limitations
  sections.push(generateLimitationsSection(scan));

  // Footer
  sections.push(generateFooter(scan));

  return sections.filter((s) => s.trim()).join("\n\n");
}

/**
 * Generate header section
 */
function generateHeader(scan) {
  const metadata = scan.metadata || {};
  const lines = [`# ${metadata.name || "Repository"}`, ""];

  if (metadata.description) {
    lines.push(`> ${metadata.description}`);
    lines.push("");
  }

  lines.push(
    `- **Owner**: [@${metadata.owner}](https://github.com/${metadata.owner})`,
  );
  lines.push(`- **Branch**: \`${scan.branch}\``);

  if (metadata.stargazers > 0) {
    lines.push(`- **Stars**: ⭐ ${metadata.stargazers}`);
  }

  if (metadata.topics && metadata.topics.length > 0) {
    lines.push(`- **Topics**: ${metadata.topics.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Generate features section
 */
function generateFeaturesSection(features) {
  const descriptions = describeFeatures(features);
  if (descriptions.length === 0) return "";

  const lines = ["## Key Features", ""];

  descriptions.forEach((desc) => {
    lines.push(`- ${desc}`);
  });

  return lines.join("\n");
}

/**
 * Generate tech stack section
 */
function generateTechStackSection(techStack) {
  if (!hasAnyTech(techStack)) return "";

  const lines = ["## Tech Stack", ""];

  if (techStack.languages?.length > 0) {
    lines.push(`**Languages**: ${techStack.languages.join(", ")}`);
  }
  if (techStack.frontend?.length > 0) {
    lines.push(`**Frontend**: ${techStack.frontend.join(", ")}`);
  }
  if (techStack.backend?.length > 0) {
    lines.push(`**Backend**: ${techStack.backend.join(", ")}`);
  }
  if (techStack.databases?.length > 0) {
    lines.push(`**Databases**: ${techStack.databases.join(", ")}`);
  }
  if (techStack.tools?.length > 0) {
    lines.push(`**Tools & Build**: ${techStack.tools.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Generate architecture section
 */
function generateArchitectureSection(scan, features) {
  const lines = ["## Architecture"];

  if (features.architecturePattern) {
    lines.push(`**Pattern**: ${features.architecturePattern}`);
  }

  if (features.isMonolith) {
    lines.push("**Structure**: Monolithic application");
  }

  if (scan.files && scan.files.length > 0) {
    // Group files by directory
    const dirs = new Map();
    scan.files.forEach((file) => {
      const parts = file.path.split("/");
      if (parts.length > 1) {
        const dir = parts[0];
        if (!dirs.has(dir)) {
          dirs.set(dir, []);
        }
        dirs.get(dir).push(file);
      }
    });

    if (dirs.size > 0) {
      lines.push("");
      lines.push("**Core Directories**:");
      Array.from(dirs.entries())
        .slice(0, 8) // Show top 8
        .forEach(([dir, files]) => {
          lines.push(`- \`/${dir}\` - ${files.length} file(s)`);
        });

      if (dirs.size > 8) {
        lines.push(`- ...and ${dirs.size - 8} more directories`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Generate code quality section
 */
function generateQualitySection(scan) {
  const health = generateHealthSummary(scan);
  const lines = ["## Code Quality Report", ""];

  lines.push(
    `${health.emoji} **Health Score**: ${health.grade} (${health.finalScore}/100)`,
  );
  lines.push(`**Status**: ${health.status}`);
  lines.push(`**Description**: ${health.description}`);

  if (scan.statistics) {
    lines.push("");
    lines.push("**Metrics**:");
    lines.push(`- Files Analyzed: ${scan.statistics.filesAnalyzed}`);
    lines.push(`- Total Issues: ${scan.statistics.totalSmells}`);

    if (scan.statistics.smellsBySeverity) {
      const {
        high = 0,
        medium = 0,
        low = 0,
      } = scan.statistics.smellsBySeverity;
      lines.push(`- Critical Issues: ${high}`);
      lines.push(`- Medium Issues: ${medium}`);
      lines.push(`- Low Issues: ${low}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate security section
 */
function generateSecuritySection(scan) {
  const securitySmells = (scan.smells || []).filter(
    (s) => s.category === "security",
  );

  if (securitySmells.length === 0) return "";

  const lines = ["## Security Observations"];

  securitySmells.slice(0, 5).forEach((smell) => {
    lines.push(
      `- ⚠️ **${smell.id}** ([${smell.file}#L${smell.lineStart}](${smell.githubUrl})): ${smell.message}`,
    );
  });

  if (securitySmells.length > 5) {
    lines.push(`- ...and ${securitySmells.length - 5} more security issues`);
  }

  return lines.join("\n");
}

/**
 * Generate performance section
 */
function generatePerformanceSection(scan) {
  const perfSmells = (scan.smells || []).filter(
    (s) => s.category === "performance",
  );

  if (perfSmells.length === 0) return "";

  const lines = ["## Performance Notes"];

  perfSmells.slice(0, 5).forEach((smell) => {
    lines.push(`- 🐢 **${smell.id}**: ${smell.message}`);
  });

  return lines.join("\n");
}

/**
 * Generate folder structure section
 */
function generateStructureSection(scan) {
  if (!scan.files || scan.files.length === 0) return "";

  const lines = ["## Folder Structure"];
  lines.push("");

  // Show sample structure
  const dirs = new Map();
  scan.files.slice(0, 20).forEach((file) => {
    const parts = file.path.split("/");
    let current = "";
    for (let i = 0; i < parts.length - 1; i++) {
      current += parts[i] + "/";
      if (!dirs.has(current)) {
        dirs.set(current, []);
      }
    }
  });

  lines.push("```");
  Array.from(dirs.keys())
    .slice(0, 10)
    .forEach((dir) => {
      const depth = (dir.match(/\//g) || []).length;
      const indent = "  ".repeat(depth);
      const name = dir.split("/").filter((p) => p)[0];
      if (!lines.some((l) => l.includes(`${name}/`))) {
        lines.push(`${indent}${name}/`);
      }
    });
  lines.push("```");

  return lines.join("\n");
}

/**
 * Generate getting started section
 */
function generateGettingStartedSection(scan) {
  const lines = ["## Getting Started"];
  lines.push("");
  lines.push("1. Clone the repository");
  lines.push(`   \`\`\`bash`);
  lines.push(`   git clone https://github.com/${scan.owner}/${scan.repo}.git`);
  lines.push(`   cd ${scan.repo}`);
  lines.push(`   \`\`\``);
  lines.push("");
  lines.push("2. Install dependencies");
  lines.push(`   \`\`\`bash`);
  lines.push(`   npm install`);
  lines.push(`   \`\`\``);
  lines.push("");
  lines.push("3. Review the codebase structure and configuration files");

  return lines.join("\n");
}

/**
 * Generate limitations/todos section
 */
function generateLimitationsSection(scan) {
  const lines = ["## Improvement Opportunities"];

  const missing = [];

  const health = generateHealthSummary(scan);
  if (health.finalScore < 70) {
    missing.push("Address code quality issues (see Quality Report)");
  }

  const hasTests = scan.files?.some((f) => /\.test\.|\.spec\./.test(f.path));
  if (!hasTests) {
    missing.push("Add automated test coverage");
  }

  const securityIssues = (scan.smells || []).filter(
    (s) => s.category === "security",
  );
  if (securityIssues.length > 0) {
    missing.push(`Address ${securityIssues.length} security concern(s)`);
  }

  if (missing.length === 0) {
    return "";
  }

  missing.forEach((item) => {
    lines.push(`- [ ] ${item}`);
  });

  return lines.join("\n");
}

/**
 * Generate footer
 */
function generateFooter(scan) {
  return (
    `---\n` +
    `*This README was generated from code analysis on ${new Date().toLocaleDateString()}.* ` +
    `[View scan details](https://github.com/${scan.owner}/${scan.repo}/tree/${scan.branch})`
  );
}

// Helper functions

function hasSecurityIssues(scan) {
  return (scan.smells || []).some((s) => s.category === "security");
}

function hasPerformanceIssues(scan) {
  return (scan.smells || []).some((s) => s.category === "performance");
}

function hasAnyTech(techStack) {
  return (
    (techStack.frontend?.length || 0) +
      (techStack.backend?.length || 0) +
      (techStack.databases?.length || 0) +
      (techStack.tools?.length || 0) +
      (techStack.languages?.length || 0) >
    0
  );
}
