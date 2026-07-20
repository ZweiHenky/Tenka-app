export function resolveNombre(list: { id: string; nombre: string }[], id: string) {
  return list.find((i) => i.id === id)?.nombre ?? id
}
