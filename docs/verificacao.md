# Verificação da migração AV1 → AV2

Executada em 24/10/2026, somente na AV2. A origem `C:\Users\Master\AV1` foi preservada. Os hashes dos validadores CNPJ/DataEntrada coincidem com os originais.

## Resultado

| Verificação | Resultado |
|---|---|
| Build no Windows, Node 24.13.0 / Prisma 7.10.1 | Aprovado |
| Jest no Windows com PostgreSQL 16 | 4 suítes, 92 testes aprovados |
| npm ci e build no Ubuntu 24.04, Node 24.13.0 | Aprovados |
| Jest no Ubuntu em contêiner, mesmo PostgreSQL de teste | 4 suítes, 92 testes aprovados |
| Unitários sem banco com jest.unit.config.js | 2 suítes, 18 testes aprovados |
| Jornada real de requests.http | 23 requisições aprovadas, executada duas vezes |
| Health, HTML do Swagger e CSS estático por HTTP | 200; banco up |
| Geração de docs/openapi.json | Aprovada |
| Encerramento SIGTERM | Handler no Windows e sinal real no Ubuntu; código 0 |
| npm audit após correção transitiva de handlebars | 0 vulnerabilidades |
| Tipagem de src, tests, scripts e seed | Aprovada |

No Ubuntu, a base da imagem é ubuntu:24.04, atualizada por apt; não foi usada uma VM de desktop. Os handlers de SIGINT/SIGBREAK existem no bootstrap; o sinal real automatizado nesta verificação foi SIGTERM. Windows 10 e diferentes derivados Ubuntu não foram testados individualmente.

## Fases realizadas

1. Fundação: ambiente, Fastify, Swagger, erros, health, Compose; build e testes herdados.
2. Banco: schema, migrations inicial/constraints, migrate dev, seed no PostgreSQL e build/testes.
3. Domínio: entidades/validadores movidos, Autenticavel assíncrona, origem de movimentação corrigida e mapas de transição; build/testes.
4. Auth: bcrypt, JWT, RBAC, usuários e senha persistida; build/testes.
5. Negócio: organizações/contratos, lotes/equipamentos, transações e versão; build/testes.
6. Relatórios e auditoria: consultas reais e agregação financeira; build/testes.
7. Substituição dos testes da CLI, limpeza da persistência antiga, ADRs, segurança, README e contrato OpenAPI.
8. Build/testes finais nos dois sistemas, servidor HTTP, documentação e jornada real.

Não houve importação automática dos antigos arquivos cifrados. A base demonstrativa vem do seed, conforme solicitado. As duas execuções da jornada adicionaram lotes/equipamentos de exemplo ao banco de desenvolvimento e reutilizaram a organização/contrato da jornada. O banco de testes é limpo ao fim das suítes.

## Reproduzir o Ubuntu pelo Docker

Com o Compose do projeto já ativo e sem rodar simultaneamente outra suíte que use o mesmo banco de teste:

```text
docker build -f docker/Dockerfile.verificacao -t greencode-av2-verificacao .
docker run --rm --network greencode-av2_default -e DATABASE_URL=postgresql://greencode:greencode@postgres:5432/greencode -e DATABASE_URL_TEST=postgresql://greencode:greencode@postgres:5432/greencode_test greencode-av2-verificacao
```

A imagem de verificação é amd64 e instala Node a partir do arquivo oficial com conferência SHA-256. Seu contexto ignora .env, node_modules, dist e o client gerado do Windows. `npm ci` e `prisma generate` ocorrem no Ubuntu. O nome de rede corresponde ao Compose iniciado com `-p greencode-av2`.

Para repetir a jornada de HTTP, deixe `npm start`/`npm run dev` ativo e rode `npm run test:jornada`. O executor lê os próprios blocos nomeados de requests.http, confere os status e valida peso, status final e histórico. Comentários de reutilização permitem repetir a jornada sem duplicar a organização.
