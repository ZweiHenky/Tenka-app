import { afterEach, describe, expect, it } from "vitest"
import { withEnvironmentAppLinks } from "../../../app.config"

type IntentFilter = {
  data: { host: string; pathPrefix: string }[]
}

const originalAppEnv = process.env.EXPO_PUBLIC_APP_ENV

afterEach(() => {
  if (originalAppEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV
  else process.env.EXPO_PUBLIC_APP_ENV = originalAppEnv
})

function hostsFor(appEnv: string) {
  process.env.EXPO_PUBLIC_APP_ENV = appEnv
  const config = withEnvironmentAppLinks({
    name: "Tenka",
    slug: "tenka",
    android: {
      intentFilters: [{ action: "VIEW", data: [{ host: "tenka.studio", pathPrefix: "/liga" }] }],
    },
  }, appEnv)
  const filters = config.android?.intentFilters as IntentFilter[] | undefined
  return filters?.flatMap((filter) => filter.data.map((entry) => `${entry.host}${entry.pathPrefix}`))
}

describe("Expo app links por ambiente", () => {
  it.each(["local", "production"])("no agrega testing en %s", (appEnv) => {
    expect(hostsFor(appEnv)).toEqual(["tenka.studio/liga"])
  })

  it("agrega los tres enlaces de testing solo en preview", () => {
    expect(hostsFor("preview")).toEqual([
      "tenka.studio/liga",
      "testing.tenka.studio/liga",
      "testing.tenka.studio/arbitro",
      "testing.tenka.studio/equipo",
    ])
  })
})
