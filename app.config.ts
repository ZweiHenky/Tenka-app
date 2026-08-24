import type { ConfigContext, ExpoConfig } from "expo/config"

const PREVIEW_HOST = "testing.tenka.studio"
const APP_LINK_PATHS = ["/liga", "/arbitro", "/equipo"]

type IntentFilter = NonNullable<NonNullable<ExpoConfig["android"]>["intentFilters"]>[number]

function intentFilter(host: string, pathPrefix: string): IntentFilter {
  return {
    action: "VIEW",
    autoVerify: true,
    data: [{ scheme: "https", host, pathPrefix }],
    category: ["BROWSABLE", "DEFAULT"],
  }
}

export function withEnvironmentAppLinks(config: ExpoConfig, appEnv = process.env.EXPO_PUBLIC_APP_ENV): ExpoConfig {
  const baseIntentFilters = config.android?.intentFilters ?? []
  const previewIntentFilters = appEnv === "preview"
    ? APP_LINK_PATHS.map((pathPrefix) => intentFilter(PREVIEW_HOST, pathPrefix))
    : []

  return {
    ...config,
    android: {
      ...config.android,
      intentFilters: [...baseIntentFilters, ...previewIntentFilters],
    },
  }
}

export default ({ config }: ConfigContext): ExpoConfig => withEnvironmentAppLinks({
  ...config,
  name: config.name ?? "Tenka",
  slug: config.slug ?? "tenka",
})
