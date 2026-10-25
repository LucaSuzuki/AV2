import { buildApp } from './app';
import { lerEnv } from './config/env';

async function main() {
  const config = lerEnv();
  const app = await buildApp({ config });
  let encerrando = false;
  async function encerrar(motivo: string, codigo = 0) {
    if (encerrando) return;
    encerrando = true;
    app.log.info({ motivo }, 'Encerrando servidor');
    const limite = setTimeout(() => process.exit(1), config.shutdownTimeoutMs);
    limite.unref();
    try { await app.close(); clearTimeout(limite); process.exitCode = codigo; }
    catch (err) { app.log.error({ err }, 'Falha ao encerrar'); process.exitCode = 1; }
  }
  const sinais: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  if (process.platform === 'win32') sinais.push('SIGBREAK');
  sinais.forEach(sinal => process.once(sinal, () => void encerrar(sinal)));
  process.once('uncaughtException', err => { app.log.fatal({ err }); void encerrar('uncaughtException', 1); });
  process.once('unhandledRejection', err => { app.log.fatal({ err }); void encerrar('unhandledRejection', 1); });
  try { await app.listen({ port: config.port, host: config.host }); }
  catch (err) { app.log.error({ err }); await encerrar('listen', 1); }
}
void main().catch(err => { console.error(err.message); process.exitCode = 1; });
