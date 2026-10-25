# Segurança — AV2

O algoritmo de senha é **bcrypt**, implementado por **bcryptjs** em JavaScript puro para portabilidade Windows/Linux sem compilação nativa. Custo padrão 12, configurável por BCRYPT_COST entre 10 e 16; salt embutido no hash. SHA-256 do AV1 foi retirado por ser rápido demais contra força bruta offline. Senhas novas têm pelo menos 12 caracteres e no máximo 72 bytes UTF-8 para evitar truncamento do bcrypt.

JWT contém sub, usuario, papel, jti e expiração fixa de **30 minutos**. Renovação exige token válido e usuário ativo, usando seu papel atual. Logout retorna 204, registra journal e exige descarte do token no cliente. JWT já emitido continua válido até expirar, inclusive após logout/troca de senha. Escritas sensíveis em usuários verificam papel e atividade no banco; demais rotas confiam nos claims. Denylist Redis/sessões seriam evolução para revogação imediata.

Login inválido devolve sempre `Credenciais invalidas`. Usuário inexistente também executa bcrypt.compare com hash dummy. Seed exige senha admin por ambiente e não cria contas de demonstração em produção.

## Permissões

| Papel | Permissão |
|---|---|
| ADMINISTRADOR | Todas |
| OPERADOR_CADASTRO | Cadastros/edições de organizações, contratos, lotes e cadastro de equipamentos; leituras e relatórios |
| GESTOR_ALMOXARIFADO | Triagem/status de lotes e estado/rastreamento de equipamentos; leituras e relatórios |
| AUDITORIA | Leituras de domínio, relatórios e journal |

Usuários só podem ser geridos pelo administrador; journal é exclusivo de admin/auditoria. Acesso a auth/renovar, logout e mudança da própria senha é permitido a todos os autenticados. Autoexclusão e remoção/rebaixamento do último administrador são bloqueados em transação Serializable.

Hook global protege tudo salvo GET/HEAD health/docs, POST login e preflight OPTIONS. Cada rota de domínio aplica authorize por papel. JSON Schema rejeita campos desconhecidos. Respostas selecionam explicitamente campos públicos, sem hashSenha.

## Proteções operacionais

- Helmet, CORS restrito às origens separadas por vírgula em CORS_ORIGIN e bodyLimit de 1 MiB.
- Rate limit local ao processo: 200/min/IP global e 5/min/IP no login. Ao usar proxy, definir trustProxy só para endereços conhecidos antes da exposição externa.
- Logs Pino com redact de Authorization, senha, senhaAtual, senhaNova e hashSenha. Bodies não são logados. Erro 500 é genérico e tem requestId para correlação.
- DATABASE_URL e JWT_SECRET >=32 caracteres são obrigatórios. Segredos em .env ignorado; somente .env.example é versionado.
- Em produção, HTTPS no proxy, credenciais próprias e privilégios mínimos no banco. Compose é configuração de desenvolvimento.
- SIGINT/SIGTERM e SIGBREAK no Windows fecham Fastify e Prisma com timeout. Falhas não tratadas usam o mesmo encerramento com código 1.

## Integridade e retenção

Cada escrita, movimentação e journal compartilham a transação. Snapshots são sanitizados recursivamente. Movimentações são imutáveis no banco. Journal não tem limpeza automática: retenção indefinida atende ao mínimo de 180 dias; preservar essa política também nos backups.

Versao evita sobrescrita concorrente, retornando 409. Banco protege CNPJ, códigos, posições, estado, peso, ano, vigência, valor, FKs, data futura e desmonte antes de triagem. A janela de 90 dias fica no service por ser regra de criação.

## Testes de falha

App.inject e PostgreSQL real cobrem login/credenciais, tokens ausente/adulterado/expirado, renovação, persistência de senha, rate limit, RBAC, autoexclusão/último admin, schemas/corpo/CORS/helmet, CNPJ inválido/duplicado, datas futuras/antigas, organização inativa, justificativa e origem de movimentação, transições/desmonte, unicidades, relatórios e jornada completa. Há rollback, PATCHs concorrentes, seed idempotente, health degradado, desconexão Prisma e violações de cada CHECK/trigger por SQL cru.

Testes recusam DATABASE_URL_TEST igual ao principal ou banco cujo nome não termine em `_test`. TRUNCATE fica restrito ao banco de testes.
