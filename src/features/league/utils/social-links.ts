export const LEAGUE_SOCIAL_FIELDS = ["facebook", "x", "instagram", "tiktok"] as const

export type LeagueSocialField = (typeof LEAGUE_SOCIAL_FIELDS)[number]
export type LeagueSocialForm = Record<LeagueSocialField, string>
export type LeagueSocialPayload = Partial<Record<LeagueSocialField, string | null>>

const SOCIAL_LABELS: Record<LeagueSocialField, string> = {
  facebook: "Facebook",
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
}

export function buildLeagueSocialPayload(
  form: LeagueSocialForm,
  isEdit: boolean,
): { payload: LeagueSocialPayload; error: string | null } {
  const payload: LeagueSocialPayload = {}

  for (const field of LEAGUE_SOCIAL_FIELDS) {
    const value = form[field].trim()
    if (!value) {
      if (isEdit) payload[field] = null
      continue
    }

    let isHttpsUrl = false
    try {
      isHttpsUrl = new URL(value).protocol === "https:"
    } catch {
      // The message below covers malformed URLs and non-HTTPS URLs alike.
    }
    if (!isHttpsUrl) {
      return { payload: {}, error: `${SOCIAL_LABELS[field]} debe ser una URL HTTPS válida` }
    }

    payload[field] = value
  }

  return { payload, error: null }
}
