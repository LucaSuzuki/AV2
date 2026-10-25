# Decisões arquiteturais — Greencode AV2

O projeto AV1 foi migrado em oito fases para uma API monolítica. O domínio mantém as entidades e relações do diagrama recebido. O frontend SPA fica para uma próxima etapa.

## ADR 01 — Monólito modular

**Contexto:** equipe acadêmica e um fluxo coeso de logística reversa.

**Decisão:** um processo Node.js, módulos por domínio e um PostgreSQL.

**Consequências:** implantação e depuração simples, transações locais; banco compartilhado e escala inicialmente vertical. Extrair um módulo quando houver necessidade comprovada de autonomia ou escala independente.

**Alternativas rejeitadas:** microsserviços exigiriam mensageria e consistência distribuída desproporcionais ao problema atual.

## ADR 02 — Controller → Service → Repository

**Contexto:** a CLI misturava interação, validação e armazenamento.

**Decisão:** controllers traduzem HTTP, services validam/orquestram e repositories consultam/mapeiam linhas para entidades. BaseRepository.transacao oferece a unidade transacional ao service; cada método aceita PrismaClientOuTx.

**Consequências:** regras independentes de HTTP; algum código adicional por módulo. Prisma não aparece nos controllers; seu uso operacional fica nos repositories. Plugin inicializa/desconecta o client; seed e testes são infraestrutura e também usam o client diretamente.

**Alternativas rejeitadas:** Prisma nos controllers dispersaria as regras.

## ADR 03 — Fastify e JSON Schema

**Contexto:** validar entradas e documentar a API.

**Decisão:** Fastify 5, schemas Ajv para body/params/query e schemas públicos de resposta. Swagger UI em /docs. Campos desconhecidos são rejeitados.

**Consequências:** contratos explícitos, validação e serialização eficientes, hooks de segurança e documentação a partir das mesmas definições.

**Alternativas rejeitadas:** Express demandaria integrações adicionais; Zod duplicaria o Ajv solicitado.

## ADR 04 — Prisma 7

**Contexto:** banco com migrations e tipos.

**Decisão:** Prisma 7.10.1 estável, prisma.config.ts, generator prisma-client em src/generated/prisma (ignorado), moduleFormat cjs e adapter @prisma/adapter-pg. A URL fica no config conforme a major instalada. Migrations versionadas; constraints/triggers em SQL manual.

**Consequências:** consultas tipadas; regras avançadas ainda exigem SQL. Decimal vira number nos mappers. Gerar o client no SO de destino. Node 24 LTS recomendado; a linha 22 precisa ser >=22.12 para o Prisma 7.

**Alternativas rejeitadas:** TypeORM adicionaria metadados/decorators; Knex/SQL cru exigiriam mais mapeamento manual. Prisma 8 RC não foi adotado por ser pré-lançamento.

Referência: [configuração e adapters no Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).

## ADR 05 — PostgreSQL 16

**Contexto:** atomicidade, unicidades e relações normalizadas.

**Decisão:** PostgreSQL com UUID, JSONB, FK Restrict, CHECKs e triggers, executado por Compose no desenvolvimento.

**Consequências:** invariantes protegidos inclusive fora da API; dependência do dialeto PostgreSQL.

**Alternativas rejeitadas:** MySQL exigiria outro dialeto e adaptação de JSONB/triggers; arquivos JSON não oferecem concorrência e atomicidade equivalentes.

## ADR 06 — JWT stateless

**Contexto:** AV1 usava sessões de 30 minutos em memória.

**Decisão:** @fastify/jwt com sub, usuario, papel, jti e expiração de 30 minutos. Renovação emite outro token; logout audita e o cliente apaga o token.

**Consequências:** reinícios preservam sessões com o mesmo segredo. Logout e troca de senha não revogam JWT já emitido. Escritas em usuários verificam no banco papel e atividade atuais; renovação consulta o usuário atual. Demais rotas confiam nos claims até expiração.

**Alternativas rejeitadas:** sessão server-side/denylist Redis daria revogação imediata com infraestrutura adicional.

## ADR 07 — bcryptjs

**Contexto:** SHA-256 é rápido demais para armazenamento de senhas.

**Decisão:** algoritmo bcrypt em JS puro, custo padrão 12 (10..16), salt embutido, senhas novas >=12 caracteres e <=72 bytes UTF-8.

**Consequências:** portabilidade e custo adaptativo; hashes consomem CPU. Testes usam custo 10.

**Alternativas rejeitadas:** bcrypt nativo exigiria avaliar toolchains; scrypt/argon2 divergem do bcrypt solicitado; SHA-256 não oferece custo adaptativo.

## ADR 08 — Concorrência

**Contexto:** evitar sobrescrita silenciosa e violações entre linhas.

**Decisão:** versao em todos os modelos, updateMany com id+versao e incremento. Zero linhas diferencia 404/409. Cliente envia versão também no DELETE lógico. Services abrem transações pela unidade de trabalho do repository. Invariantes entre linhas (último administrador, criação/transição de lote/equipamento e desativação de organização) usam Serializable. P2034 vira 409 para recarregar/repetir.

**Consequências:** evita lost updates/write skew; o cliente trata conflitos. Triggers usam travas curtas ao conferir o lote. Finalizar desmontes antes de encaminhar o lote mantém R4 se o próprio lote mudar.

**Alternativas rejeitadas:** locks pessimistas longos bloqueiam desnecessariamente; retry automático esconderia conflito de intenção.

## ADR 09 — Journal transacional

**Contexto:** log em arquivo podia divergir dos dados.

**Decisão:** cada escrita da API e seu journal compartilham commit, com antes/depois e ator do JWT. Snapshots removem recursivamente senhas, hashes e tokens. Movimentações são append-only com trigger. Journal tem retenção indefinida; não há limpeza automática.

**Consequências:** falha ao auditar desfaz a escrita; monitorar crescimento e preservar backups por pelo menos 180 dias. Seed é bootstrap idempotente, não uma simulação das rotas.

**Alternativas rejeitadas:** arquivo e envio assíncrono deixam intervalo de inconsistência.

## ADR 10 — Normalização e domínio

**Contexto:** AV1 duplicava equipamentos nos lotes e no arquivo próprio.

**Decisão:** Organização 1—0..1 Contrato, Organização 1—N Lote, Lote 1—N Equipamento, Equipamento 1—N Movimentação. Equipamento tem uma única linha e FK. Classes preservam peso/depreciação/vigência; financeiro agrega valores de contratos assinados no período, mesmo vencidos. Estado físico é Int 0..6. Validadores foram movidos sem alteração.

**Consequências:** sem duplicação persistida; DateTime e unicidades no banco. Regra de 90 dias só na criação via service, permitindo histórico antigo no banco. Usuários/organizações usam desativação lógica. Contrato é opcional para receber lote. Transições seguem o mapa, sem o salto opcional de inservível para descarte.

**Alternativas rejeitadas:** exigir contrato vigente impediria fluxo permitido; enum Prisma string perderia a semântica numérica de estado físico.

## ADR 11 — Multiplataforma

**Contexto:** Windows 10+ e Ubuntu 24.04.03+.

**Decisão:** Node LTS, bcryptjs, tsx, scripts npm portáveis, path.resolve/join para arquivos, .gitattributes e Compose. Instalação nativa documentada. Testes exigem PostgreSQL real em banco separado com nome terminado em _test. A transformação JS do Jest é restrita às dependências ESM content-disposition (Swagger) e cookie (app.inject), mantendo o comando jest --runInBand.

**Consequências:** npm ci e geração do client em cada destino; node_modules/dist não são versionados.

**Alternativas rejeitadas:** scripts bash exclusivos, binários copiados entre SOs e SQLite nos testes introduziriam divergências.

## Correções AV1

| Item | Solução |
|---|---|
| C1 | Origem capturada antes da alteração e teste de regressão |
| C2 | Mapas de transição validados nos services |
| C3 | PUT/renovação de contrato persistidos e auditados |
| C4 | Organização existente/ativa e FK |
| C5/C6 | Normalização e DateTime/Decimal tipados |
| C7 | bcrypt e senha persistida |
| C8 | JWT global e RBAC por rota |
| C9 | Quatro relatórios reais |
| C10 | Senha admin por ambiente |
| C11/C12 | PECAS_REAPROVEITADAS sem acento e Int com CHECK |
| C13 | tmp-data removido e ignorado |
| C14 | AuthService implementa Autenticavel assíncrona |
