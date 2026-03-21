import type { User } from '@/lib/api';

/** Unifica la respuesta del backend (login, /auth/me, listados) al tipo `User` del front. */
export function normalizeUserFromApi(rawUser: Record<string, unknown>): User {
  const rawRol = String(rawUser.rol ?? rawUser.role ?? 'tecnico_interno')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const rolesValidos: User['rol'][] = ['admin', 'operario', 'tecnico_interno', 'tecnico_proveedor'];
  const rol = rolesValidos.includes(rawRol as User['rol']) ? (rawRol as User['rol']) : 'tecnico_interno';

  const rawJid = (rawUser as { juzgado_id?: unknown; juzgadoId?: unknown }).juzgado_id ?? (rawUser as { juzgadoId?: unknown }).juzgadoId;
  const rawJuzgadoIds = (rawUser as { juzgadoIds?: unknown }).juzgadoIds;
  let juzgadoIds =
    Array.isArray(rawJuzgadoIds) && rawJuzgadoIds.length > 0 ? rawJuzgadoIds.map((x) => Number(x)).filter((n) => !Number.isNaN(n)) : undefined;
  let juzgadoIdNum = rawJid != null && rawJid !== '' ? Number(rawJid) : juzgadoIds?.[0];
  const juzgadosArr = (rawUser as { juzgados?: unknown }).juzgados;
  if ((juzgadoIdNum == null || Number.isNaN(Number(juzgadoIdNum))) && Array.isArray(juzgadosArr) && juzgadosArr.length > 0) {
    const first = juzgadosArr[0] as { id?: unknown };
    if (first?.id != null) juzgadoIdNum = Number(first.id);
  }
  let juzgadoRel = (rawUser as { juzgado?: { id?: unknown; nombre?: unknown } }).juzgado;
  if ((!juzgadoRel || typeof juzgadoRel !== 'object') && Array.isArray(juzgadosArr) && juzgadosArr.length > 0) {
    const first = juzgadosArr[0] as { id?: unknown; nombre?: unknown };
    if (first?.id != null) juzgadoRel = { id: first.id, nombre: first.nombre };
  }
  const juzgado =
    juzgadoRel && typeof juzgadoRel === 'object' && juzgadoRel.id != null ? { id: Number(juzgadoRel.id), nombre: String(juzgadoRel.nombre ?? '') } : undefined;

  if ((!juzgadoIds || juzgadoIds.length === 0) && Array.isArray(juzgadosArr) && juzgadosArr.length > 0) {
    const ids = juzgadosArr.map((x) => Number((x as { id?: unknown }).id)).filter((n) => !Number.isNaN(n));
    if (ids.length > 0) juzgadoIds = ids;
  }

  return {
    id: Number(rawUser.id),
    nombre: String(rawUser.nombre ?? rawUser.name ?? ''),
    email: String(rawUser.email ?? ''),
    rol,
    activo: rawUser.activo !== undefined ? Boolean(rawUser.activo) : true,
    ...(rawUser.iniciales != null && { iniciales: String(rawUser.iniciales) }),
    ...(rawUser.avatarColor != null && { avatarColor: String(rawUser.avatarColor) }),
    ...(juzgadoIdNum != null && !Number.isNaN(juzgadoIdNum) ? { juzgado_id: juzgadoIdNum } : {}),
    ...(juzgado ? { juzgado } : {}),
    ...(juzgadoIds && juzgadoIds.length > 0 ? { juzgadoIds } : {}),
  };
}

