import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("native location config", () => {
  const app = JSON.parse(readFileSync(resolve(process.cwd(), "app.json"), "utf8")).expo
  const plugin = app.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === "expo-location")

  it("configures foreground location without background modes", () => {
    expect(plugin).toBeDefined()
    expect(plugin[1]).toMatchObject({
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
      isAndroidForegroundServiceEnabled: false,
    })
    expect(app.ios.infoPlist.UIBackgroundModes).not.toContain("location")
  })

  it("does not request Android background location", () => {
    expect(app.android.permissions ?? []).not.toContain("ACCESS_BACKGROUND_LOCATION")
  })
})
