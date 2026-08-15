import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadToCloudinary } from "./upload"

const mocks = vi.hoisted(() => ({ apiPost: vi.fn(), cloudinaryPost: vi.fn() }))
vi.mock("@/infrastructure/api/client", () => ({ api: { post: mocks.apiPost } }))
vi.mock("axios", () => ({ default: { post: mocks.cloudinaryPost } }))

const intent = {
  intentId: "intent-1",
  publicId: "myleague/local/user/team_logo/id",
  signature: "sig",
  apiKey: "key",
  cloudName: "cloud",
  uploadParams: { public_id: "myleague/local/user/team_logo/id", timestamp: 1, allowed_formats: "jpg,jpeg,png,webp,heic" },
}

const source = { fileSize: 1024, mimeType: "image/jpeg" }

describe("uploadToCloudinary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the authenticated signed flow and returns only the managed asset", async () => {
    mocks.apiPost.mockResolvedValueOnce({ data: { data: intent } })
    mocks.cloudinaryPost.mockResolvedValue({ data: { public_id: intent.publicId, secure_url: "https://res.cloudinary.com/cloud/image/upload/v1/id.jpg", bytes: 5, format: "jpg", width: 200, height: 200 } })
    mocks.apiPost.mockResolvedValueOnce({ data: { data: { mediaAssetId: "asset-1", url: "approved-url" } } })

    await expect(uploadToCloudinary("file:///photo.jpg", "TEAM_LOGO", source)).resolves.toEqual({ mediaAssetId: "asset-1", url: "approved-url" })
    expect(mocks.apiPost).toHaveBeenNthCalledWith(1, "/api/media/sign-upload", { kind: "TEAM_LOGO" })
    expect(mocks.apiPost).toHaveBeenNthCalledWith(2, "/api/media/complete", expect.objectContaining({ intentId: "intent-1", public_id: intent.publicId }))
  })

  it("rejects an oversized image before signing", async () => {
    await expect(uploadToCloudinary("file:///photo.jpg", "TEAM_LOGO", { fileSize: 6 * 1024 * 1024, mimeType: "image/jpeg" })).rejects.toThrow("5 MB")
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it("rejects a mismatched provider public ID and abandons the intent", async () => {
    mocks.apiPost.mockResolvedValueOnce({ data: { data: intent } }).mockResolvedValueOnce({})
    mocks.cloudinaryPost.mockResolvedValue({ data: { public_id: "attacker/id" } })
    await expect(uploadToCloudinary("file:///photo.jpg", "TEAM_LOGO", source)).rejects.toThrow("inesperado")
    expect(mocks.apiPost).toHaveBeenLastCalledWith("/api/media/intent-1/abandon")
  })

  it("preserves an uploaded intent when completion is rate limited", async () => {
    const rateLimitError = Object.assign(new Error("Demasiadas solicitudes"), { response: { status: 429 } })
    mocks.apiPost.mockResolvedValueOnce({ data: { data: intent } }).mockRejectedValueOnce(rateLimitError)
    mocks.cloudinaryPost.mockResolvedValue({ data: { public_id: intent.publicId, secure_url: "https://res.cloudinary.com/cloud/image/upload/v1/id.jpg", bytes: 5, format: "jpg", width: 200, height: 200 } })

    await expect(uploadToCloudinary("file:///photo.jpg", "TEAM_LOGO", source)).rejects.toBe(rateLimitError)
    expect(mocks.apiPost).toHaveBeenCalledTimes(2)
    expect(mocks.apiPost).not.toHaveBeenCalledWith("/api/media/intent-1/abandon")
  })
})
