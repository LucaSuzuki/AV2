import { objeto, texto, dataHora, uuid } from '../../shared/schemas';
import { papelSchema } from '../usuarios/usuario.schemas';
export const loginSchema = objeto({ usuario: texto, senha: { type: 'string', minLength: 1, maxLength: 72 } }, ['usuario', 'senha']);
export const senhaSchema = objeto({ senhaAtual: { type: 'string', minLength: 1, maxLength: 72 }, senhaNova: { type: 'string', minLength: 12, maxLength: 72 } }, ['senhaAtual', 'senhaNova']);
export const tokenResposta = objeto({ token: { type: 'string' }, expiraEm: dataHora, usuario: objeto({ id: uuid, usuario: texto, papel: papelSchema }) });
