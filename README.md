# Greencode

API REST de logística reversa de resíduos eletrônicos, migrada do projeto AV1 para a AV2. Recebimento, triagem, desmonte, rastreabilidade, organizações/contratos, usuários e relatórios em um monólito modular.

## Stack e requisitos

- Node.js **24 LTS recomendado**; package.json exige >=22 (Prisma 7 requer >=22.12 na linha 22).
- TypeScript, Fastify 5, Prisma 7.10, PostgreSQL **16+**, JWT, bcryptjs, Jest/ts-jest.
- Docker Desktop/Engine com Compose, ou PostgreSQL nativo.
- Windows 10+ ou Ubuntu 24.04.03+ e derivados. Não há frontend nesta etapa; a API aceita CORS configurável.

## Instalação no Windows

Instale Node LTS pelo instalador oficial e Docker Desktop com backend WSL2. No PowerShell, dentro da **AV2**:

```powershell
Copy-Item .env.example .env
```

No Prompt de Comando o equivalente é `copy .env.example .env`. Edite .env: defina JWT_SECRET com pelo menos 32 caracteres e SEED_ADMIN_PASSWORD com pelo menos 12 caracteres. Depois:

```powershell
docker compose -p greencode-av2 up -d --wait
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build
npm test
npm run dev
```

Para criar uma **nova** migration durante desenvolvimento: `npm run db:migrate -- --name descricao`. As migrations existentes são aplicadas por db:deploy.

## Instalação no Ubuntu

Instale Node LTS pelo método oficial em [nodejs.org](https://nodejs.org/en/download), verificando `node --version` e `npm --version`. Instale Docker Engine e o plugin Compose conforme [Docker para Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Com o daemon ativo e acesso ao socket, dentro da AV2:

```bash
cp .env.example .env
# Edite JWT_SECRET e SEED_ADMIN_PASSWORD antes de continuar.
docker compose -p greencode-av2 up -d --wait
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build
npm test
npm run dev
```

Não copie node_modules/dist entre sistemas: execute npm ci e gere novamente o client Prisma. Scripts npm não dependem de sintaxe PowerShell/bash. `.gitattributes` normaliza fins de linha.

## PostgreSQL nativo (alternativa)

Windows: instale PostgreSQL 16+ pelo [instalador oficial indicado pelo projeto](https://www.postgresql.org/download/windows/), com psql e servidor local.

Ubuntu 24.04:

```bash
sudo apt update
sudo apt install postgresql-16 postgresql-client-16
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

No Windows abra SQL Shell (psql) como postgres; no Ubuntu use a sessão acima. Execute:

```sql
CREATE USER greencode WITH PASSWORD 'defina-senha-local';
CREATE DATABASE greencode OWNER greencode;
CREATE DATABASE greencode_test OWNER greencode;
```

Ajuste DATABASE_URL e DATABASE_URL_TEST no .env para a senha escolhida. Pule o comando docker compose e siga db:generate/deploy/seed. `prisma migrate dev` precisa de shadow database: para um usuário local de desenvolvimento, conceda `ALTER ROLE greencode CREATEDB;`, ou configure um shadow database separado. Produção usa db:deploy, sem esse privilégio.

## Configuração

| Variável | Uso / padrão do exemplo |
|---|---|
| NODE_ENV | development; production não cria usuários de demonstração |
| PORT / HOST | 3000 / 0.0.0.0 |
| DATABASE_URL | Banco principal PostgreSQL |
| DATABASE_URL_TEST | Banco diferente, nome terminado em `_test` |
| JWT_SECRET | Obrigatório, >=32 caracteres |
| JWT_EXPIRES_IN | 30m, preserva R6 |
| CORS_ORIGIN | http://localhost:5173; múltiplas origens separadas por vírgula |
| SEED_ADMIN_USER | admin |
| SEED_ADMIN_PASSWORD | Obrigatória no seed, >=12 caracteres e <=72 bytes |
| BCRYPT_COST | 12; intervalo 10..16 |
| LOG_LEVEL | info |
| SHUTDOWN_TIMEOUT_MS | 10000 |

No Compose, POSTGRES_PORT opcional muda a porta publicada (padrão 5432); ajuste as URLs para a mesma porta. O volume nomeado persiste os dados. O script docker/init-test-db.sql cria o banco de testes no **primeiro** uso do volume. Em volume anterior que ainda não o possua: `docker compose -p greencode-av2 exec postgres createdb -U greencode greencode_test`.

.env não é versionado. Não use os segredos do exemplo em produção. Não há administrador criado automaticamente ao subir o servidor; execute seed explicitamente.

## Scripts

| Comando | Função |
|---|---|
| npm run dev | tsx watch src/server.ts |
| npm run build | Gera Prisma e compila somente src para dist/src |
| npm start | Executa dist/src/server.js |
| npm test | Jest em série, unitários e integração PostgreSQL |
| npm run db:generate | Gera client Prisma |
| npm run db:migrate | Cria/aplica migrations de desenvolvimento |
| npm run db:deploy | Aplica migrations versionadas |
| npm run db:seed | Massa de dados idempotente |
| npm run db:reset | **Apaga o banco configurado** e reaplica migrations; uso local explícito |
| npm run db:studio | Interface Prisma Studio |
| npm run docs:openapi | Exporta docs/openapi.json |
| npm run test:jornada | Executa a jornada de requests.http contra servidor ativo |

## Usuários e massa do seed

Administrador: SEED_ADMIN_USER/SEED_ADMIN_PASSWORD do .env. Apenas fora de produção:

| Usuário | Senha de demonstração | Papel |
|---|---|---|
| operador | Operador-AV2-2026! | OPERADOR_CADASTRO |
| almoxarife | Almoxarife-AV2-2026! | GESTOR_ALMOXARIFADO |
| auditor | Auditor-AV2-2026! | AUDITORIA |

Seed usa upsert e não sobrescreve senha/dados de registros existentes. Troque a senha pela API; alterar a variável não altera uma conta previamente criada.

Inclui quatro organizações com CNPJs válidos (uma inativa), contratos vigente/vencido e organização sem contrato, cinco status de lote, oito tipos de equipamento, estados físicos 0..6 e históricos de triagem/destinação. Lotes usam datas relativas dentro de 90 dias. Dados inválidos são cenários de testes, não seed.

## Uso e fluxo

Servidor: [http://localhost:3000/health](http://localhost:3000/health). Swagger: [http://localhost:3000/docs](http://localhost:3000/docs). Configure a porta no .env.

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{"usuario":"admin","senha":"sua-senha-do-env"}
```

Copie token da resposta e envie `Authorization: Bearer <token>`. O fluxo completo está em **requests.http**, com variáveis compatíveis com a extensão REST Client. Para executar automaticamente as requisições marcadas `@name`, deixe o servidor ativo e rode `npm run test:jornada`; a jornada cria/atualiza dados demonstrativos no banco principal e usa SEED_ADMIN_USER/PASSWORD do .env. Ela pode ser repetida e reutiliza sua organização pelo CNPJ.

1. Login e cadastro de organização.
2. Criar contrato opcional e lote com equipamentos numa transação.
3. Iniciar/concluir triagem (administrador ou gestor).
4. Avançar equipamento até desmonte, destinação e baixa.
5. Encaminhar/finalizar lote e consultar rastreio, relatórios e journal.

Alterações exigem versao atual no body; até DELETE de usuário é lógico e versionado. Conflito de versão/concorrência devolve 409; recarregue. JWT dura 30 minutos, com renovação autenticada. Logout exige descarte no cliente; veja as limitações em docs/seguranca.md.

## Testes e banco isolado

`npm test` migra automaticamente DATABASE_URL_TEST antes das suítes. Os testes usam app.inject e PostgreSQL real, fazem TRUNCATE **somente no banco de testes**, recusam banco principal/nome sem `_test` e desconectam clientes ao terminar. Não apontar essa URL para dados úteis.

Cobrem validadores, entidades/cálculos, auth/RBAC, contratos/lotes/equipamentos, journal, rollback, concorrência, seed idempotente, health/shutdown do app e cada CHECK/trigger via SQL cru. Para rodar só unitários sem banco: `npx jest --runInBand --config jest.unit.config.js`.

## Estrutura

```text
prisma/                 schema, seed, migrations SQL
src/app.ts              composição testável
src/server.ts           HTTP, sinais e graceful shutdown
src/config/             ambiente
src/plugins/            Prisma, JWT, Swagger e erros
src/domain/             entidades, enums, validadores, transições
src/modules/            auth, usuarios, organizacoes, lotes,
                        equipamentos, relatorios, auditoria
src/shared/             erros, schemas, paginação, unidade de trabalho
tests/unit/             regras sem banco
tests/integration/      API e integridade SQL
tests/setup/            migração e fixtures isoladas
docs/                   ADRs, segurança, API e OpenAPI
docker/                 criação inicial do banco de testes
requests.http           jornada e exemplos negativos
```

Retenção do journal é indefinida (mínimo 180 dias), sem rotação por tamanho. Movimentações são imutáveis. A CLI, dados cifrados e sessões em memória da AV1 foram removidos da AV2; a AV1 original permanece preservada.

## Documentação

- [Decisões arquiteturais](docs/arquitetura.md)
- [Segurança](docs/seguranca.md)
- [API](docs/api.md)
- [OpenAPI](docs/openapi.json)
- [Resultados e reprodução da verificação Windows/Ubuntu](docs/verificacao.md)

## Licença

ISC

# [Gerson](https://youtu.be/u3H8O8RJp3M?si=QgdfEQUHSrQe6u9x)
