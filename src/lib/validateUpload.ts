const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_GP_EXTENSIONS = ['gp5', 'gpx', 'gp4', 'gp']
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return 'JPG, PNG, GIF, WEBP 형식만 업로드할 수 있습니다.'
  if (file.size > MAX_SIZE)
    return '파일 크기는 20MB 이하여야 합니다.'
  return null
}

export function validateBoardFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isPdf = file.type === 'application/pdf' || ext === 'pdf'
  const isGuitarPro = ALLOWED_GP_EXTENSIONS.includes(ext)
  if (!isImage && !isPdf && !isGuitarPro)
    return 'JPG, PNG, GIF, WEBP, PDF, GP5/GPX 형식만 업로드할 수 있습니다.'
  if (file.size > MAX_SIZE)
    return '파일 크기는 20MB 이하여야 합니다.'
  return null
}

export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

export function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
  } catch {
    return false
  }
}
