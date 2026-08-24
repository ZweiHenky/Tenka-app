import { describe, expect, it } from "vitest"
import { buildLeagueSocialPayload, type LeagueSocialForm } from "./social-links"

const emptyForm: LeagueSocialForm = {
  facebook: "",
  x: "",
  instagram: "",
  tiktok: "",
}

describe("buildLeagueSocialPayload", () => {
  it("omite las redes vacías al crear", () => {
    expect(buildLeagueSocialPayload(emptyForm, false)).toEqual({ payload: {}, error: null })
  })

  it("envía null para borrar redes al editar", () => {
    expect(buildLeagueSocialPayload(emptyForm, true)).toEqual({
      payload: { facebook: null, x: null, instagram: null, tiktok: null },
      error: null,
    })
  })

  it("recorta y conserva URLs HTTPS", () => {
    expect(buildLeagueSocialPayload({
      ...emptyForm,
      facebook: "  https://facebook.com/liga  ",
      instagram: "https://instagram.com/liga",
    }, false)).toEqual({
      payload: {
        facebook: "https://facebook.com/liga",
        instagram: "https://instagram.com/liga",
      },
      error: null,
    })
  })

  it.each([
    ["facebook.com/liga", "Facebook debe ser una URL HTTPS válida"],
    ["http://facebook.com/liga", "Facebook debe ser una URL HTTPS válida"],
  ])("rechaza una URL inválida: %s", (facebook, error) => {
    expect(buildLeagueSocialPayload({ ...emptyForm, facebook }, false)).toEqual({ payload: {}, error })
  })
})
