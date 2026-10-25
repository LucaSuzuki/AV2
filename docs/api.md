# API Greencode AV2

Base: `http://localhost:3000/api/v1`. JSON, datas ISO 8601 com horário/fuso, IDs UUID. Header privado: `Authorization: Bearer <token>`.

Swagger em [localhost:3000/docs](http://localhost:3000/docs). Contrato completo: [openapi.json](openapi.json), gerado por `npm run docs:openapi`; disponível também em `/docs/json`. JSON Schema nativo valida body, params e query. Exemplos em `requests.http`.

| Grupo | Operações |
|---|---|
| Auth | POST login/renovar/logout, PATCH senha |
| Usuários | POST/GET /usuarios, GET/PATCH/DELETE /usuarios/:id |
| Organizações | POST/GET /organizacoes, GET/PATCH /:id, POST /:id/desativar |
| Contratos | PUT/GET /organizacoes/:id/contrato, POST /:id/contrato/renovar |
| Lotes | POST/GET /lotes, GET/PATCH /:id, POST /:id/triagem/iniciar e concluir, PATCH /:id/status |
| Equipamentos | POST /lotes/:loteId/equipamentos, GET /equipamentos e /:id e /:id/rastreio, PATCH /:id/estado-fisico e /:id/status-rastreamento |
| Relatórios | GET /relatorios/por-organizacao/:organizacaoId, por-status, financeiro, resumo |
| Auditoria | GET /auditoria/journal |
| Infra | GET /health (503 se db down), /docs; públicos e fora de /api/v1 |

Listagens: page>=1, pageSize 1..100 (padrão 20), resposta `{items,page,pageSize,total}`. Lotes filtram dataInicio/dataFim; relatórios exigem inicio/fim (exceto por-status). Intervalos incluem extremos; período invertido retorna 422. Financeiro retorna `{valorFinanceiro}`: soma mensal dos contratos assinados no período, inclusive vencidos.

Alterações exigem versao corrente. PATCH, triagem, desativação, renovação e **DELETE de usuário** recebem `{versao:N}` no body. PUT contrato exige versao ao substituir existente; criação dispensa. Sucesso incrementa versão; conflito 409 exige recarregar. Exclusão de usuário é lógica (ativo=false).

POST lote aceita equipamentos[] numa única transação com movimentações e journal. Lote novo começa RECEBIDO; equipamento, AGUARDANDO_TRIAGEM. Cadastro de equipamento só em RECEBIDO/EM_TRIAGEM. Triagem exige pelo menos um equipamento. Desmonte exige TRIAGEM_CONCLUIDA e deve terminar antes de encaminhar o lote. Enums sem acentos; estadoFisico inteiro 0..6.

Formato de erro:

```json
{"statusCode":422,"error":"REGRA_NEGOCIO","message":"Descrição da regra","details":[]}
```

400 schema; 401 autenticação; 403 papel; 404 inexistente; 409 unicidade/versão/concorrência; 413 corpo; 422 regra/integridade; 429 limite; 500 mensagem genérica com requestId.

Logout descarta token no cliente; JWT emitido continua válido até expirar. Consulte seguranca.md.
