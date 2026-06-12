function normalizeIdentifier(raw) {
    return raw.replaceAll('"', '').replaceAll("'", '').trim().toLowerCase();
}
function parseCreateTableName(line) {
    const lower = line.toLowerCase();
    const marker = 'create table';
    const idx = lower.indexOf(marker);
    if (idx < 0)
        return null;
    const after = line.slice(idx + marker.length).trim();
    const firstToken = after.split(/[\s(]/).filter(Boolean)[0];
    if (!firstToken)
        return null;
    const normalized = firstToken.includes('.') ? firstToken.split('.').pop() || firstToken : firstToken;
    return normalizeIdentifier(normalized);
}
function parseForeignKey(line) {
    const lower = line.toLowerCase();
    const fkToken = 'foreign key (';
    const refToken = 'references';
    const fkIndex = lower.indexOf(fkToken);
    const refIndex = lower.indexOf(refToken);
    if (fkIndex < 0 || refIndex < 0 || refIndex < fkIndex)
        return null;
    const colStart = fkIndex + fkToken.length;
    const colEnd = lower.indexOf(')', colStart);
    if (colEnd < 0)
        return null;
    const column = normalizeIdentifier(line.slice(colStart, colEnd));
    const refPart = line.slice(refIndex + refToken.length).trim();
    const refTokenRaw = refPart.split(/[\s(]/).filter(Boolean)[0];
    if (!refTokenRaw)
        return null;
    const referencedTable = normalizeIdentifier(refTokenRaw.includes('.') ? refTokenRaw.split('.').pop() || refTokenRaw : refTokenRaw);
    return { column, referencedTable };
}
function parseIndexDefinition(line) {
    const lower = line.toLowerCase();
    const onToken = ' on ';
    const onIndex = lower.indexOf(onToken);
    if (onIndex < 0)
        return null;
    const afterOn = line.slice(onIndex + onToken.length).trim();
    const table = normalizeIdentifier(afterOn.split(/[\s(]/).filter(Boolean)[0] || '');
    if (!table)
        return null;
    const firstParen = line.indexOf('(', onIndex);
    const closeParen = line.indexOf(')', firstParen + 1);
    if (firstParen < 0 || closeParen < 0)
        return null;
    const column = normalizeIdentifier(line.slice(firstParen + 1, closeParen).split(',')[0] || '');
    if (!column)
        return null;
    return { table, column };
}
function findLikelyQueryLines(content) {
    const findings = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (lower.includes('select ') ||
            lower.includes('update ') ||
            lower.includes('insert ') ||
            lower.includes('delete ')) {
            findings.push({ line: i + 1, text: line.trim() });
        }
    }
    return findings;
}
export function analyzeDatabaseArtifacts(files) {
    const sqlFiles = files.filter((f) => f.path.toLowerCase().endsWith('.sql'));
    const codeFiles = files.filter((f) => ['.ts', '.tsx', '.js', '.jsx', '.sql'].some((ext) => f.path.toLowerCase().endsWith(ext)));
    const tables = new Map();
    const findings = [];
    for (const file of sqlFiles) {
        const lines = file.content.split('\n');
        let currentTable = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lower = line.toLowerCase().trim();
            if (lower.startsWith('create table')) {
                const tableName = parseCreateTableName(line);
                if (tableName) {
                    currentTable = {
                        name: tableName,
                        file: file.path,
                        line: i + 1,
                        foreignKeys: [],
                        indexedColumns: new Set(),
                    };
                    tables.set(tableName, currentTable);
                }
            }
            if (lower.startsWith('create index') || lower.startsWith('create unique index')) {
                const idx = parseIndexDefinition(line);
                if (idx && tables.has(idx.table)) {
                    tables.get(idx.table).indexedColumns.add(idx.column);
                }
            }
            if (currentTable && lower.includes('foreign key') && lower.includes('references')) {
                const fk = parseForeignKey(line);
                if (fk) {
                    currentTable.foreignKeys.push(Object.assign(Object.assign({}, fk), { line: i + 1 }));
                }
            }
            if (currentTable && lower.endsWith(');')) {
                currentTable = null;
            }
        }
    }
    for (const table of tables.values()) {
        for (const fk of table.foreignKeys) {
            if (!tables.has(fk.referencedTable)) {
                findings.push({
                    id: 'DB_INVALID_RELATIONSHIP',
                    severity: 'high',
                    category: 'reliability',
                    file: table.file,
                    lineStart: fk.line,
                    message: `Foreign key in table ${table.name} references unknown table ${fk.referencedTable}.`,
                    suggestedFix: 'Ensure referenced table exists in schema and migration execution order is valid.',
                    confidence: 0.95,
                });
            }
            if (!table.indexedColumns.has(fk.column)) {
                findings.push({
                    id: 'DB_MISSING_FK_INDEX',
                    severity: 'medium',
                    category: 'performance',
                    file: table.file,
                    lineStart: fk.line,
                    message: `Foreign key column ${fk.column} in table ${table.name} is not indexed.`,
                    suggestedFix: `Add an index on ${table.name}(${fk.column}) to speed joins and lookups.`,
                    confidence: 0.9,
                });
            }
        }
        if (table.foreignKeys.length === 0) {
            findings.push({
                id: 'DB_NO_RELATIONSHIPS',
                severity: 'low',
                category: 'maintainability',
                file: table.file,
                lineStart: table.line,
                message: `Table ${table.name} has no foreign keys. Verify if relationships are modeled correctly.`,
                suggestedFix: 'Review data model and add foreign keys where entity relationships exist.',
                confidence: 0.55,
            });
        }
    }
    for (const file of codeFiles) {
        const queryLines = findLikelyQueryLines(file.content);
        for (const q of queryLines) {
            const lower = q.text.toLowerCase();
            if (lower.includes('select *')) {
                findings.push({
                    id: 'DB_SELECT_STAR',
                    severity: 'medium',
                    category: 'performance',
                    file: file.path,
                    lineStart: q.line,
                    message: 'Query uses SELECT * which can fetch unnecessary columns and increase payload size.',
                    suggestedFix: 'Select only required columns explicitly.',
                    confidence: 0.82,
                });
            }
            if (lower.includes(' where ') && !lower.includes(' limit ') && lower.includes('order by')) {
                findings.push({
                    id: 'DB_ORDER_WITHOUT_LIMIT',
                    severity: 'low',
                    category: 'performance',
                    file: file.path,
                    lineStart: q.line,
                    message: 'ORDER BY without LIMIT may process large result sets.',
                    suggestedFix: 'Apply LIMIT/Pagination for user-facing queries when possible.',
                    confidence: 0.74,
                });
            }
            if ((lower.includes('select ') || lower.includes('update ') || lower.includes('delete ')) && q.text.includes('${')) {
                findings.push({
                    id: 'DB_DYNAMIC_SQL_INTERPOLATION',
                    severity: 'high',
                    category: 'security',
                    file: file.path,
                    lineStart: q.line,
                    message: 'Dynamic SQL interpolation detected. This may introduce SQL injection risk.',
                    suggestedFix: 'Use parameterized queries or ORM parameter binding.',
                    confidence: 0.9,
                });
            }
        }
    }
    return findings;
}
