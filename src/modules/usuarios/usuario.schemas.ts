import { PapelUsuario } from '../../domain/enums';
import { objeto, texto, uuid, versao, dataHora, paginacao } from '../../shared/schemas';
export const papelSchema = { type: 'string', enum: Object.values(PapelUsuario) };
export const usuarioResposta = objeto({ id: uuid, usuario: texto, papel: papelSchema, ativo: { type: 'boolean' }, ultimoAcesso: { anyOf: [dataHora, { type: 'null' }] }, criadoEm: dataHora, atualizadoEm: dataHora, versao });
export const criarUsuarioSchema = objeto({ usuario: { ...texto, pattern: '^[A-Za-z0-9_.-]{3,80}$' }, senha: { type: 'string', minLength: 12, maxLength: 72 }, papel: papelSchema }, ['usuario', 'senha', 'papel']);
export const atualizarUsuarioSchema = objeto({ papel: papelSchema, ativo: { type: 'boolean' }, versao }, ['versao']);
export const listarUsuariosSchema = objeto(paginacao);
