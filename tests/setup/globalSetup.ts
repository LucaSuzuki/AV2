import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { bancoTeste } from './database';
export default async function globalSetup() {
  const result = spawnSync(process.execPath, [path.resolve('node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: bancoTeste() }, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Falha na migração do banco de teste: ${result.stderr}\n${result.stdout}`);
}
