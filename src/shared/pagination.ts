export interface Paginacao { page?: number; pageSize?: number; }
export function paginar(query: Paginacao) {
  const page = query.page ?? 1, pageSize = Math.min(query.pageSize ?? 20, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
export function pagina<T>(items: T[], total: number, query: Paginacao) {
  const { page, pageSize } = paginar(query);
  return { items, page, pageSize, total };
}
