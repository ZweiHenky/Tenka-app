import { describe, it, expect } from 'vitest'
import { parseDiasPartido } from '../parse-dias-partido'

describe('parseDiasPartido', () => {
  it('parsea nombre completo de día', () => {
    expect(parseDiasPartido('Viernes')).toEqual([5])
  })

  it('parsea abreviación de 3 letras', () => {
    expect(parseDiasPartido('vie')).toEqual([5])
    expect(parseDiasPartido('lun')).toEqual([1])
    expect(parseDiasPartido('sab')).toEqual([6])
  })

  it('parsea abreviatura de 1 letra', () => {
    expect(parseDiasPartido('L')).toEqual([1])
    expect(parseDiasPartido('M')).toEqual([2])
    expect(parseDiasPartido('J')).toEqual([4])
    expect(parseDiasPartido('V')).toEqual([5])
    expect(parseDiasPartido('S')).toEqual([6])
    expect(parseDiasPartido('D')).toEqual([0])
  })

  it('parsea abreviatura de 2 letras', () => {
    expect(parseDiasPartido('lu')).toEqual([1])
    expect(parseDiasPartido('ma')).toEqual([2])
    expect(parseDiasPartido('mi')).toEqual([3])
    expect(parseDiasPartido('ju')).toEqual([4])
    expect(parseDiasPartido('vi')).toEqual([5])
    expect(parseDiasPartido('sa')).toEqual([6])
    expect(parseDiasPartido('do')).toEqual([0])
  })

  it('parsea múltiples días separados por coma', () => {
    expect(parseDiasPartido('L-V')).toEqual([1, 2, 3, 4, 5])
  })

  it('parsea rango L-V', () => {
    expect(parseDiasPartido('L-V')).toEqual([1, 2, 3, 4, 5])
  })

  it('parsea rango S-D', () => {
    expect(parseDiasPartido('S-D')).toEqual([6, 0])
  })

  it('parsea "y" como separador', () => {
    expect(parseDiasPartido('Martes y Jueves')).toEqual([2, 4])
  })

  it('parsea "/" como separador', () => {
    expect(parseDiasPartido('L/M/J')).toEqual([1, 2, 4])
  })

  it('maneja acentos', () => {
    expect(parseDiasPartido('Miércoles')).toEqual([3])
    expect(parseDiasPartido('Sábado')).toEqual([6])
  })

  it('retorna array vacío para string vacío', () => {
    expect(parseDiasPartido('')).toEqual([])
  })

  it('deduplica días repetidos', () => {
    expect(parseDiasPartido('Lunes, Lunes, L')).toEqual([1])
  })

  it('parsea "Domingo"', () => {
    expect(parseDiasPartido('Domingo')).toEqual([0])
  })
})
