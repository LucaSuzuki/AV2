import 'dotenv/config';

export function lerEnv(fonte: NodeJS.ProcessEnv = process.env) {
  const numero = (nome: string, padrao: number, min: number, max: number) => {
    const valor = Number(fonte[nome] ?? padrao);
    if (!Number.isInteger(valor) || valor < min || valor > max) throw new Error(`${nome} inválido (${min}..${max}).`);
    return valor;
  };
  if (!fonte.DATABASE_URL || !/^postgres(ql)?:\/\//.test(fonte.DATABASE_URL)) throw new Error('DATABASE_URL PostgreSQL obrigatória.');
  if (!fonte.JWT_SECRET || fonte.JWT_SECRET.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
  if (fonte.JWT_EXPIRES_IN && fonte.JWT_EXPIRES_IN !== '30m') throw new Error('JWT_EXPIRES_IN deve ser 30m (regra R6).');
  const logLevel = fonte.LOG_LEVEL ?? 'info';
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(logLevel)) throw new Error('LOG_LEVEL inválido.');
  return {
    nodeEnv: fonte.NODE_ENV ?? 'development', databaseUrl: fonte.DATABASE_URL,
    jwtSecret: fonte.JWT_SECRET, jwtExpiresIn: '30m',
    port: numero('PORT', 3000, 1, 65535), host: fonte.HOST ?? '0.0.0.0',
    corsOrigin: (fonte.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map(s => s.trim()),
    bcryptCost: numero('BCRYPT_COST', 12, 10, 16), logLevel,
    shutdownTimeoutMs: numero('SHUTDOWN_TIMEOUT_MS', 10000, 100, 120000),
  };
}
export type Config = ReturnType<typeof lerEnv>;
