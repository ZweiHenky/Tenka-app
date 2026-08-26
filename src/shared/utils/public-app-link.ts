import type { AppEnv } from "@/infrastructure/config/env"

export function publicAppLink(appEnv: AppEnv, path: string): string {
  const origin = appEnv === "preview" ? "https://testing.tenka.studio" : "https://tenka.studio"
  return `${origin}/${path.replace(/^\/+/, "")}`
}
