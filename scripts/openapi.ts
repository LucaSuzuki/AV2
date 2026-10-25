import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildApp } from '../src/app';
import { lerEnv } from '../src/config/env';
async function main() {
  const config = lerEnv({ ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost/greencode', JWT_SECRET: process.env.JWT_SECRET ?? 'documentacao-local-sem-acesso-ao-banco' });
  const app = await buildApp({ config, logger: false });
  try {
    await app.ready();
    await mkdir(path.resolve('docs'), { recursive: true });
    await writeFile(path.resolve('docs', 'openapi.json'), JSON.stringify(app.swagger(), null, 2) + '\n');
    console.log('docs/openapi.json atualizado.');
  } finally { await app.close(); }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
