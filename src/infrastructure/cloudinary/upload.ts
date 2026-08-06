import axios from "axios"
import { api } from "@/infrastructure/api/client"

export type MediaKind = "LEAGUE_LOGO" | "LEAGUE_COVER" | "TEAM_LOGO" | "ACCOUNT_AVATAR" | "PLAYER_PHOTO"

interface UploadIntent {
  intentId: string
  publicId: string
  signature: string
  apiKey: string
  cloudName: string
  uploadParams: Record<string, string | number>
}

export interface UploadSource {
  fileSize?: number | null
  mimeType?: string | null
}

export async function uploadToCloudinary(uri: string, kind: MediaKind, source: UploadSource = {}): Promise<{ mediaAssetId: string; url: string }> {
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase() || "jpg"
  if (!["jpg", "jpeg", "png", "webp", "heic"].includes(extension)) throw new Error("Formato de imagen no permitido")
  if (source.fileSize != null && source.fileSize > 5 * 1024 * 1024) throw new Error("La imagen no puede superar 5 MB")

  const type = source.mimeType || `image/${extension === "jpg" ? "jpeg" : extension}`

  const intentResponse = await api.post<{ data: UploadIntent }>("/api/media/sign-upload", { kind })
  const intent = intentResponse.data.data
  const formData = new FormData()
  formData.append("file", { uri, type, name: `upload.${extension}` } as any)
  for (const [key, value] of Object.entries(intent.uploadParams)) formData.append(key, String(value))
  formData.append("signature", intent.signature)
  formData.append("api_key", intent.apiKey)

  try {
    const uploaded = await axios.post(`https://api.cloudinary.com/v1_1/${intent.cloudName}/image/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    if (uploaded.data.public_id !== intent.publicId) throw new Error("Cloudinary devolvió un recurso inesperado")
    const completion = await api.post<{ data: { mediaAssetId: string; url: string } }>("/api/media/complete", {
      intentId: intent.intentId,
      public_id: uploaded.data.public_id,
      secure_url: uploaded.data.secure_url,
      bytes: uploaded.data.bytes,
      format: uploaded.data.format,
      width: uploaded.data.width,
      height: uploaded.data.height,
    })
    return completion.data.data
  } catch (error) {
    await api.post(`/api/media/${intent.intentId}/abandon`).catch(() => undefined)
    throw error
  }
}
