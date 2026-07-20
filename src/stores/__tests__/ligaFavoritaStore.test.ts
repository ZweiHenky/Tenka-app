import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}))

import { useLigaFavoritaStore } from '../ligaFavoritaStore'
import type { LigaFavoritaItem } from '../ligaFavoritaStore'

const LIGA_A: LigaFavoritaItem = { id: '1', nombre: 'Liga A', cancha: null, logo: null }
const LIGA_B: LigaFavoritaItem = { id: '2', nombre: 'Liga B', cancha: 'campo.jpg', logo: 'logo.png' }

describe('ligaFavoritaStore', () => {
  beforeEach(() => {
    useLigaFavoritaStore.setState({ favoritos: [] })
  })

  it('empieza vacía', () => {
    expect(useLigaFavoritaStore.getState().favoritos).toEqual([])
  })

  it('agrega un item con toggle', () => {
    useLigaFavoritaStore.getState().toggle(LIGA_A)
    expect(useLigaFavoritaStore.getState().favoritos).toEqual([LIGA_A])
  })

  it('toggle agrega si no existe', () => {
    useLigaFavoritaStore.getState().toggle(LIGA_A)
    useLigaFavoritaStore.getState().toggle(LIGA_B)
    expect(useLigaFavoritaStore.getState().favoritos).toEqual([LIGA_A, LIGA_B])
  })

  it('toggle elimina si ya existe', () => {
    useLigaFavoritaStore.getState().toggle(LIGA_A)
    useLigaFavoritaStore.getState().toggle(LIGA_B)
    useLigaFavoritaStore.getState().toggle(LIGA_A)
    expect(useLigaFavoritaStore.getState().favoritos).toEqual([LIGA_B])
  })

  it('esFavorito retorna true si existe', () => {
    useLigaFavoritaStore.getState().toggle(LIGA_A)
    expect(useLigaFavoritaStore.getState().esFavorito('1')).toBe(true)
  })

  it('esFavorito retorna false si no existe', () => {
    expect(useLigaFavoritaStore.getState().esFavorito('1')).toBe(false)
  })
})
