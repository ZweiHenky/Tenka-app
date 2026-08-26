import { describe, expect, it } from "vitest"
import { publicAppLink } from "../public-app-link"

describe("publicAppLink", () => {
  it("usa testing para preview", () => {
    expect(publicAppLink("preview", "/liga/liga-1")).toBe("https://testing.tenka.studio/liga/liga-1")
  })

  it.each(["local", "production"] as const)("usa la landing pública para %s", (appEnv) => {
    expect(publicAppLink(appEnv, "equipo/equipo-1/division/division-1"))
      .toBe("https://tenka.studio/equipo/equipo-1/division/division-1")
  })
})
