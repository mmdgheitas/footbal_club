import 'reflect-metadata';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';

/**
 * Verifies the TypeORM entity layer against database/schema.sql:
 * every column name in the SQL DDL must exist in the mapped metadata, and
 * every mapped column must exist in the DDL. Catches drift in both directions.
 */
async function main(): Promise<void> {
  const sql = fs.readFileSync('../database/schema.sql', 'utf8');

  // --- parse schema.sql -----------------------------------------------------
  // Skip constraint/index declarations AND their continuation lines
  // ("ON DELETE CASCADE ON UPDATE CASCADE", "REFERENCES ...").
  const skip =
    /^\s*(PRIMARY\s+KEY|UNIQUE\s+INDEX|UNIQUE\s+KEY|INDEX|KEY|CONSTRAINT|FOREIGN\s+KEY|ON\b|REFERENCES\b)/i;
  const ddl = new Map<string, string[]>();
  const re = /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\) ENGINE/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const table = m[1];
    const cols: string[] = [];
    for (const rawLine of m[2].split('\n')) {
      const line = rawLine.trim().replace(/,\s*$/, '');
      if (!line || skip.test(line)) continue;
      const cm = /^`?([a-z_][a-z0-9_]*)`?\s+/i.exec(line);
      if (cm) cols.push(cm[1]);
    }
    ddl.set(table, cols);
  }

  // --- build TypeORM metadata ----------------------------------------------
  const ds = new DataSource(dataSourceOptions);
  await (ds as any).buildMetadatas();

  let totalDdl = 0;
  let problems = 0;

  for (const [table, sqlCols] of [...ddl.entries()].sort()) {
    totalDdl += sqlCols.length;
    const meta = ds.entityMetadatas.find((e) => e.tableName === table);
    if (!meta) {
      console.log(`MISSING ENTITY for table ${table}`);
      problems++;
      continue;
    }
    const mapped = new Set(meta.columns.map((c) => c.databaseName));
    const missingInEntity = sqlCols.filter((c) => !mapped.has(c));
    const extraInEntity = [...mapped].filter((c) => !sqlCols.includes(c));

    const ok = missingInEntity.length === 0 && extraInEntity.length === 0;
    if (!ok) problems++;
    console.log(
      `${ok ? 'OK  ' : 'DIFF'} ${table.padEnd(28)} sql=${String(sqlCols.length).padStart(2)} entity=${String(mapped.size).padStart(2)}` +
        (missingInEntity.length ? `  missing-in-entity: ${missingInEntity.join(',')}` : '') +
        (extraInEntity.length ? `  extra-in-entity: ${extraInEntity.join(',')}` : ''),
    );
  }

  const mappedTotal = ds.entityMetadatas.reduce((n, e) => n + e.columns.length, 0);
  console.log(`\nschema.sql columns: ${totalDdl}   entity columns: ${mappedTotal}`);
  console.log(problems === 0 ? 'SCHEMA <-> ENTITIES MATCH EXACTLY' : `${problems} TABLE(S) DIFFER`);
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
