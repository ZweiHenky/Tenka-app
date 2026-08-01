import axios from "axios"
import { env } from "@/infrastructure/config/env"

export async function uploadToCloudinary(uri: string): Promise<{ url: string; publicId: string }> {
  const formData = new FormData()
  formData.append("file", { uri, type: "image/jpeg", name: "upload.jpg" } as any)
  formData.append("upload_preset", env.CLOUDINARY_UPLOAD_PRESET)
  const { data } = await axios.post(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  )
  return { url: data.secure_url as string, publicId: data.public_id as string }
}
