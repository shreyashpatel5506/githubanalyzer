import ts from 'typescript';
import { SCAN_CONFIG } from './scanConfig';
function posToLine(sourceFile, pos) {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}
function getNodeText(node, sourceFile) {
    return sourceFile.text.slice(node.getStart(sourceFile), node.getEnd());
}
function isCodeLanguage(language) {
    return language === 'typescript' || language === 'tsx' || language === 'javascript' || language === 'jsx';
}
function normalizeForDuplicateCheck(text) {
    let out = '';
    for (const char of text) {
        const isWhitespace = char === ' ' || char === '\n' || char === '\r' || char === '\t';
        if (isWhitespace)
            continue;
        out += char;
    }
    return out;
}
function getLanguage(filePath) {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.tsx'))
        return 'tsx';
    if (lower.endsWith('.ts'))
        return 'typescript';
    if (lower.endsWith('.jsx'))
        return 'jsx';
    if (lower.endsWith('.js'))
        return 'javascript';
    if (lower.endsWith('.json'))
        return 'json';
    if (lower.endsWith('.yml') || lower.endsWith('.yaml'))
        return 'yaml';
    if (lower.endsWith('.sql'))
        return 'sql';
    return 'unknown';
}
function analyzeMetrics(content, lines, sourceFile, language) {
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;
    let functions = 0;
    let asyncFunctions = 0;
    let consoleCount = 0;
    let complexity = 1;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            blankLines++;
            continue;
        }
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            commentLines++;
            continue;
        }
        codeLines++;
        if (trimmed.includes('console.log(') || trimmed.includes('console.warn(') || trimmed.includes('console.error(')) {
            consoleCount++;
        }
    }
    if (isCodeLanguage(language)) {
        const visit = (node, depth) => {
            if (ts.isFunctionDeclaration(node) ||
                ts.isFunctionExpression(node) ||
                ts.isArrowFunction(node) ||
                ts.isMethodDeclaration(node)) {
                functions++;
                const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
                const isAsync = modifiers === null || modifiers === void 0 ? void 0 : modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
                if (isAsync)
                    asyncFunctions++;
            }
            if (ts.isIfStatement(node) ||
                ts.isForStatement(node) ||
                ts.isForOfStatement(node) ||
                ts.isForInStatement(node) ||
                ts.isWhileStatement(node) ||
                ts.isDoStatement(node) ||
                ts.isCaseClause(node) ||
                ts.isCatchClause(node) ||
                ts.isConditionalExpression(node) ||
                ts.isBinaryExpression(node) &&
                    (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                        node.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
                complexity++;
            }
            let nextDepth = depth;
            if (ts.isIfStatement(node) ||
                ts.isForStatement(node) ||
                ts.isForOfStatement(node) ||
                ts.isForInStatement(node) ||
                ts.isWhileStatement(node) ||
                ts.isDoStatement(node) ||
                ts.isSwitchStatement(node) ||
                ts.isTryStatement(node)) {
                nextDepth += 1;
            }
            maxNestingDepth = Math.max(maxNestingDepth, nextDepth);
            ts.forEachChild(node, (child) => visit(child, nextDepth));
        };
        let maxNestingDepth = 0;
        visit(sourceFile, 0);
        return {
            totalLines: lines.length,
            codeLines,
            commentLines,
            blankLines,
            functions,
            asyncFunctions,
            consoleCount,
            maxNestingDepth,
            complexity,
        };
    }
    return {
        totalLines: lines.length,
        codeLines,
        commentLines,
        blankLines,
        functions,
        asyncFunctions,
        consoleCount,
        maxNestingDepth: 0,
        complexity,
    };
}
const maintainabilityRules = [
    ({ metrics, sourceFile }) => {
        const findings = [];
        if (metrics.totalLines > SCAN_CONFIG.THRESHOLDS.LARGE_FILE_LOC) {
            findings.push({
                id: 'LARGE_FILE',
                severity: 'medium',
                category: 'maintainability',
                lineStart: 1,
                lineEnd: metrics.totalLines,
                message: `File has ${metrics.totalLines} lines, which reduces readability and maintainability.`,
                confidence: 0.95,
                suggestedFix: 'Split this file into smaller modules organized by responsibility.',
            });
        }
        if (metrics.maxNestingDepth > SCAN_CONFIG.THRESHOLDS.MAX_NESTING_DEPTH) {
            findings.push({
                id: 'DEEP_NESTING',
                severity: 'medium',
                category: 'maintainability',
                lineStart: 1,
                lineEnd: metrics.totalLines,
                message: `Nesting depth reached ${metrics.maxNestingDepth}, above recommended threshold.`,
                confidence: 0.89,
                suggestedFix: 'Use guard clauses and extract nested blocks into dedicated helpers.',
            });
        }
        if (metrics.consoleCount > SCAN_CONFIG.THRESHOLDS.MAX_CONSOLE_LOGS) {
            findings.push({
                id: 'EXCESSIVE_CONSOLE_USAGE',
                severity: 'low',
                category: 'maintainability',
                lineStart: 1,
                lineEnd: metrics.totalLines,
                message: `Detected ${metrics.consoleCount} console calls.`,
                confidence: 0.8,
                suggestedFix: 'Replace ad-hoc logging with a centralized logger and log levels.',
            });
        }
        const functionBodies = new Map();
        const identifierUsage = new Map();
        const visit = (node) => {
            if (ts.isFunctionDeclaration(node) ||
                ts.isFunctionExpression(node) ||
                ts.isArrowFunction(node) ||
                ts.isMethodDeclaration(node)) {
                const body = node.body;
                if (body) {
                    const startLine = posToLine(sourceFile, body.getStart(sourceFile));
                    const endLine = posToLine(sourceFile, body.getEnd());
                    const bodyLength = Math.max(1, endLine - startLine + 1);
                    if (bodyLength > SCAN_CONFIG.THRESHOLDS.LARGE_FUNCTION_LOC) {
                        findings.push({
                            id: 'LONG_FUNCTION',
                            severity: 'high',
                            category: 'maintainability',
                            lineStart: startLine,
                            lineEnd: endLine,
                            message: `Function body spans ${bodyLength} lines.`,
                            confidence: 0.9,
                            suggestedFix: 'Split this function into smaller composable units and keep one responsibility per function.',
                        });
                    }
                    const normalized = normalizeForDuplicateCheck(getNodeText(body, sourceFile));
                    const arr = functionBodies.get(normalized) || [];
                    arr.push(startLine);
                    functionBodies.set(normalized, arr);
                }
            }
            if (ts.isClassDeclaration(node) && node.members.length > 15) {
                findings.push({
                    id: 'LARGE_CLASS',
                    severity: 'high',
                    category: 'maintainability',
                    lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                    lineEnd: posToLine(sourceFile, node.getEnd()),
                    message: `Class contains ${node.members.length} members and may violate single responsibility.`,
                    confidence: 0.88,
                    suggestedFix: 'Split class responsibilities into smaller services/components.',
                });
            }
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
                const name = node.name.text;
                identifierUsage.set(name, (identifierUsage.get(name) || 0) + 1);
            }
            if (ts.isIdentifier(node)) {
                identifierUsage.set(node.text, (identifierUsage.get(node.text) || 0) + 1);
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        for (const [normalizedBody, lines] of functionBodies.entries()) {
            if (normalizedBody.length < 60)
                continue;
            if (lines.length > 1) {
                findings.push({
                    id: 'DUPLICATE_LOGIC',
                    severity: 'medium',
                    category: 'maintainability',
                    lineStart: lines[0],
                    message: `Potential duplicate function logic found in ${lines.length} places.`,
                    confidence: 0.78,
                    suggestedFix: 'Extract shared logic into a common utility or helper function.',
                });
            }
        }
        for (const [name, count] of identifierUsage.entries()) {
            if (count === 1 && !name.startsWith('_')) {
                findings.push({
                    id: 'POSSIBLE_DEAD_CODE',
                    severity: 'low',
                    category: 'maintainability',
                    lineStart: 1,
                    message: `Identifier '${name}' appears to be declared but not reused.`,
                    confidence: 0.5,
                    suggestedFix: 'Remove unused declarations or wire them into the intended code path.',
                });
            }
        }
        return findings;
    },
];
const reliabilityRules = [
    ({ sourceFile }) => {
        const findings = [];
        const visit = (node) => {
            if (ts.isCatchClause(node) && (!node.block.statements || node.block.statements.length === 0)) {
                findings.push({
                    id: 'EMPTY_CATCH',
                    severity: 'high',
                    category: 'reliability',
                    lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                    lineEnd: posToLine(sourceFile, node.getEnd()),
                    message: 'Empty catch block suppresses errors and hides failures.',
                    confidence: 0.95,
                    suggestedFix: 'Log, wrap, or rethrow the error with meaningful context.',
                });
            }
            if (ts.isAwaitExpression(node)) {
                let parent = node.parent;
                while (parent) {
                    if (ts.isForStatement(parent) || ts.isForOfStatement(parent) || ts.isForInStatement(parent) || ts.isWhileStatement(parent)) {
                        findings.push({
                            id: 'AWAIT_IN_LOOP',
                            severity: 'medium',
                            category: 'reliability',
                            lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                            message: 'Await inside loop can cause serial execution and timeout risk.',
                            confidence: 0.9,
                            suggestedFix: 'Batch independent async work with Promise.all where ordering is not required.',
                        });
                        break;
                    }
                    parent = parent.parent;
                }
            }
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
                const memberName = node.expression.name.text;
                if (memberName === 'then') {
                    const fullCall = getNodeText(node.parent, sourceFile);
                    if (!fullCall.includes('.catch(')) {
                        findings.push({
                            id: 'PROMISE_WITHOUT_CATCH',
                            severity: 'high',
                            category: 'reliability',
                            lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                            message: 'Promise chain uses .then without explicit error handling.',
                            confidence: 0.86,
                            suggestedFix: 'Append .catch() or use async/await with try/catch.',
                        });
                    }
                }
            }
            if (ts.isElementAccessExpression(node) && ts.isNumericLiteral(node.argumentExpression) && node.argumentExpression.text === '0') {
                findings.push({
                    id: 'UNGUARDED_ARRAY_ACCESS',
                    severity: 'low',
                    category: 'reliability',
                    lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                    message: 'Array element access at index 0 without visible length guard may fail on empty arrays.',
                    confidence: 0.62,
                    suggestedFix: 'Guard with array length checks before accessing fixed indexes.',
                });
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return findings;
    },
];
const securityRules = [
    ({ sourceFile }) => {
        const findings = [];
        const visit = (node) => {
            if (ts.isCallExpression(node)) {
                if (ts.isIdentifier(node.expression) && node.expression.text === 'eval') {
                    findings.push({
                        id: 'EVAL_USAGE',
                        severity: 'critical',
                        category: 'security',
                        lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                        message: 'eval() usage introduces arbitrary code execution risk (OWASP A03: Injection).',
                        confidence: 0.99,
                        suggestedFix: 'Replace eval with safe parsing or strict allowlisted behavior.',
                    });
                }
                if (ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
                    findings.push({
                        id: 'NEW_FUNCTION_USAGE',
                        severity: 'critical',
                        category: 'security',
                        lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                        message: 'Function constructor behaves like eval and is unsafe.',
                        confidence: 0.97,
                        suggestedFix: 'Avoid dynamic code generation and use explicit function maps.',
                    });
                }
            }
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                if (ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'innerHTML') {
                    findings.push({
                        id: 'INNER_HTML_ASSIGNMENT',
                        severity: 'high',
                        category: 'security',
                        lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                        message: 'Direct innerHTML assignment can create XSS risk (OWASP A03).',
                        confidence: 0.93,
                        suggestedFix: 'Sanitize content and prefer textContent or safe rendering abstractions.',
                    });
                }
            }
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
                const nameLower = node.name.text.toLowerCase();
                const looksSensitive = nameLower.includes('password') ||
                    nameLower.includes('secret') ||
                    nameLower.includes('token') ||
                    nameLower.includes('apikey') ||
                    nameLower.includes('api_key');
                if (looksSensitive && ts.isStringLiteralLike(node.initializer)) {
                    findings.push({
                        id: 'HARDCODED_SECRET',
                        severity: 'critical',
                        category: 'security',
                        lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                        message: 'Potential hardcoded credential detected (OWASP A02: Cryptographic Failures).',
                        confidence: 0.9,
                        suggestedFix: 'Move secrets to environment variables or secret manager integrations.',
                    });
                }
            }
            if (ts.isTemplateExpression(node)) {
                const headLower = node.head.text.toLowerCase();
                const looksSql = headLower.includes('select ') ||
                    headLower.includes('insert ') ||
                    headLower.includes('update ') ||
                    headLower.includes('delete ');
                if (looksSql && node.templateSpans.length > 0) {
                    findings.push({
                        id: 'SQL_INJECTION_RISK',
                        severity: 'high',
                        category: 'security',
                        lineStart: posToLine(sourceFile, node.getStart(sourceFile)),
                        message: 'SQL string interpolation detected; this can allow injection (OWASP A03).',
                        confidence: 0.9,
                        suggestedFix: 'Use parameterized SQL statements or ORM bindings.',
                    });
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return findings;
    },
    ({ language, lines }) => {
        if (language !== 'json' && language !== 'yaml')
            return [];
        const findings = [];
        for (let i = 0; i < lines.length; i++) {
            const lower = lines[i].toLowerCase();
            if (lower.includes('cors') && lower.includes('*')) {
                findings.push({
                    id: 'OPEN_CORS_CONFIGURATION',
                    severity: 'high',
                    category: 'security',
                    lineStart: i + 1,
                    message: 'Open CORS wildcard detected in config.',
                    confidence: 0.86,
                    suggestedFix: 'Restrict allowed origins to trusted domains.',
                });
            }
        }
        return findings;
    },
];
function runRules(rules, context) {
    const output = [];
    for (const rule of rules) {
        try {
            output.push(...rule(context));
        }
        catch (_a) {
            // keep scanner resilient per-rule
        }
    }
    return output;
}
export function detectSmells(content, filePath) {
    if (!content || typeof content !== 'string') {
        return {
            path: filePath,
            language: 'unknown',
            metrics: {
                totalLines: 0,
                codeLines: 0,
                commentLines: 0,
                blankLines: 0,
                functions: 0,
                asyncFunctions: 0,
                consoleCount: 0,
                maxNestingDepth: 0,
                complexity: 0,
            },
            smells: [],
        };
    }
    const language = getLanguage(filePath);
    const lines = content.split('\n');
    const scriptKind = language === 'tsx'
        ? ts.ScriptKind.TSX
        : language === 'typescript'
            ? ts.ScriptKind.TS
            : language === 'jsx'
                ? ts.ScriptKind.JSX
                : ts.ScriptKind.JS;
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
    const metrics = analyzeMetrics(content, lines, sourceFile, language);
    const context = {
        sourceFile,
        content,
        lines,
        metrics,
        language,
    };
    const smells = [
        ...runRules(maintainabilityRules, context),
        ...(isCodeLanguage(language) ? runRules(reliabilityRules, context) : []),
        ...runRules(securityRules, context),
    ];
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    smells.sort((a, b) => {
        var _a, _b;
        const sa = (_a = order[a.severity]) !== null && _a !== void 0 ? _a : 99;
        const sb = (_b = order[b.severity]) !== null && _b !== void 0 ? _b : 99;
        return sa - sb || a.lineStart - b.lineStart;
    });
    return { path: filePath, language, metrics, smells };
}
