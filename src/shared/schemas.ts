export const texto = { type: 'string', minLength: 1, maxLength: 255 } as const;
export const uuid = { type: 'string', format: 'uuid' } as const;
export const dataHora = { type: 'string', format: 'date-time' } as const;
export const versao = { type: 'integer', minimum: 1 } as const;
export const objeto = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required });
export const idParams = objeto({ id: uuid }, ['id']);
export const paginacao = { page: { type: 'integer', minimum: 1, default: 1 }, pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 } };
export const erroSchema = objeto({ statusCode: { type: 'integer' }, error: texto, message: { type: 'string' }, details: { type: 'array', items: {} }, requestId: texto }, ['statusCode', 'error', 'message', 'details']);
export const respostaPagina = (item: unknown) => objeto({ items: { type: 'array', items: item }, page: versao, pageSize: versao, total: { type: 'integer' } }, ['items', 'page', 'pageSize', 'total']);
export function schema(tags: string[], response: unknown, extra: Record<string, unknown> = {}, status = 200) {
  return { tags, response: { [status]: response, 400: erroSchema, 401: erroSchema, 403: erroSchema, 404: erroSchema, 409: erroSchema, 422: erroSchema, 429: erroSchema, 500: erroSchema }, ...extra };
}
export const semConteudo = { type: 'null' };
