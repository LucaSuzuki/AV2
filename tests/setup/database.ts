import 'dotenv/config';
export function bancoTeste() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Configure DATABASE_URL_TEST para executar os testes de integração.');
  const parsed = new URL(url);
  if (!parsed.pathname.endsWith('_test') || url === process.env.DATABASE_URL) throw new Error('Banco de testes deve terminar em _test e ser diferente do banco principal.');
  return url;
}
