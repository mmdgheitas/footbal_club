import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import { dataSourceOptions } from '../src/database/data-source';

/**
 * Validates every @Entity / @Column / relation mapping by building TypeORM's
 * metadata graph. This exercises the real entity decorators without opening a
 * database connection, so it catches duplicate columns, bad relation inverses
 * and enum misconfigurations.
 */
async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await (ds as any).buildMetadatas();

  const metas = ds.entityMetadatas;
  console.log(`entities with valid metadata: ${metas.length} / ${ALL_ENTITIES.length}`);

  let cols = 0;
  let rels = 0;
  for (const m of metas.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
    const r = m.columns.filter((c) => c.relationMetadata).length;
    cols += m.columns.length;
    rels += r;
    console.log(
      `  ${m.tableName.padEnd(28)} ${String(m.columns.length).padStart(3)} cols  ${String(r).padStart(2)} relations`,
    );
  }
  console.log(`TOTAL COLUMNS MAPPED: ${cols}`);
  console.log(`TOTAL RELATIONS:      ${rels}`);

  if (metas.length !== ALL_ENTITIES.length) {
    console.error('MISMATCH: not all entities produced metadata');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('METADATA ERROR:', e.message);
  process.exit(1);
});
