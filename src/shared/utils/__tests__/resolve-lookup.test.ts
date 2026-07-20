import { describe, it, expect } from 'vitest'
import { resolveNombre } from '../resolve-lookup'

const FAKE_LIST = [
  { id: 'a1', nombre: 'Libre' },
  { id: 'b2', nombre: 'Femenino' },
]

describe('resolveNombre', () => {
  it('retorna el nombre cuando el id existe', () => {
    expect(resolveNombre(FAKE_LIST, 'a1')).toBe('Libre')
  })

  it('retorna el nombre para otro id existente', () => {
    expect(resolveNombre(FAKE_LIST, 'b2')).toBe('Femenino')
  })

  it('retorna el id cuando no hay match', () => {
    expect(resolveNombre(FAKE_LIST, 'x9')).toBe('x9')
  })

  it('retorna el id cuando la lista está vacía', () => {
    expect(resolveNombre([], 'a1')).toBe('a1')
  })
})
