export const IMAGE_BYTES = 5 * 1024 * 1024
export const EXPORT_SIDE = 4096
const mimeExtensions: Record<string, RegExp> = { 'image/png': /\.png$/i, 'image/jpeg': /\.jpe?g$/i, 'image/webp': /\.webp$/i }

export function validateImageFile(file: File) {
  if (!file.size || file.size > IMAGE_BYTES || !mimeExtensions[file.type]?.test(file.name)) throw new Error('请选择 1 字节至 5MB 的 PNG、JPEG 或 WebP 图片')
}

// 在浏览器解码前读取尺寸，避免小体积文件触发无界像素分配。实际内容仍由浏览器和服务端分别解码校验。
export function imageHeaderSize(bytes: ArrayBuffer, mime: string): { width: number; height: number } {
  const v = new DataView(bytes), u = new Uint8Array(bytes)
  const text = (offset: number, length: number) => String.fromCharCode(...u.subarray(offset, offset + length))
  const invalid = () => { throw new Error('图片格式不匹配或文件已损坏') }
  if (mime === 'image/png' && v.byteLength >= 24 && text(1, 3) === 'PNG' && text(12, 4) === 'IHDR') return { width: v.getUint32(16), height: v.getUint32(20) }
  if (mime === 'image/jpeg' && u[0] === 255 && u[1] === 216) {
    let i = 2
    while (i + 4 < u.length) {
      if (u[i++] !== 255) return invalid()
      while (u[i] === 255) i++
      const marker = u[i++]!
      if (marker === 217 || marker === 218) break
      const length = v.getUint16(i)
      if (length < 2 || i + length > u.length) return invalid()
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 7) return { width: v.getUint16(i + 5), height: v.getUint16(i + 3) }
      i += length
    }
  }
  if (mime === 'image/webp' && u.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    const chunk = text(12, 4)
    if (chunk === 'VP8X') {
      if (u[20]! & 2) throw new Error('暂不支持动画图片，请选择静态图片')
      return { width: 1 + u[24]! + (u[25]! << 8) + (u[26]! << 16), height: 1 + u[27]! + (u[28]! << 8) + (u[29]! << 16) }
    }
    if (chunk === 'VP8 ' && u[23] === 157 && u[24] === 1 && u[25] === 42) return { width: v.getUint16(26, true) & 16383, height: v.getUint16(28, true) & 16383 }
    if (chunk === 'VP8L' && u[20] === 47) return { width: 1 + u[21]! + ((u[22]! & 63) << 8), height: 1 + (u[22]! >> 6) + (u[23]! << 2) + ((u[24]! & 15) << 10) }
  }
  return invalid()
}

export function boundedSize(width: number, height: number, limit = EXPORT_SIDE) {
  const scale = Math.min(1, limit / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

const canvasBlob = (canvas: HTMLCanvasElement, mime: string, quality?: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法导出图片，请缩小尺寸后重试')), mime, quality))

export async function prepareImage(file: File): Promise<Blob> {
  validateImageFile(file)
  const size = imageHeaderSize(await file.arrayBuffer(), file.type)
  if (!size.width || !size.height || size.width * size.height > 32_000_000 || Math.max(size.width, size.height) > 32768) throw new Error('图片像素过大，请先缩小至 3200 万像素以内')
  const url = URL.createObjectURL(file), image = new Image()
  try {
    image.src = url
    await image.decode()
    const output = boundedSize(image.naturalWidth, image.naturalHeight)
    // 浏览器解码处理 EXIF 方向；规范化为有界位图后再交给交互裁切组件。
    const canvas = document.createElement('canvas')
    canvas.width = output.width; canvas.height = output.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器无法处理图片')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    try { return await canvasBlob(canvas, 'image/png') } finally { canvas.width = canvas.height = 0 }
  } catch (cause) { throw cause instanceof Error && cause.message.includes('图片') ? cause : new Error('图片无法解码，请检查文件是否损坏') }
  finally { image.src = ''; URL.revokeObjectURL(url) }
}

export async function exportImage(canvas: HTMLCanvasElement, mime: string, grayscale: boolean, brightness: number): Promise<File> {
  if (Math.min(canvas.width, canvas.height) < 1 || Math.max(canvas.width, canvas.height) > EXPORT_SIDE) throw new Error('导出宽高需为 1 至 4096 像素')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法处理图片')
  // 使用像素处理以兼容 Safari；保留原 alpha，不依赖仅作用于预览的 CSS filter。
  if (grayscale || brightness !== 100) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height), values = pixels.data
    for (let i = 0; i < values.length; i += 4) {
      const gray = .2126 * values[i]! + .7152 * values[i + 1]! + .0722 * values[i + 2]!
      for (let c = 0; c < 3; c++) values[i + c] = (grayscale ? gray : values[i + c]!) * brightness / 100
    }
    context.putImageData(pixels, 0, 0)
  }
  let blob = await canvasBlob(canvas, mime, .92)
  if (blob.size > IMAGE_BYTES && mime !== 'image/png') {
    for (const quality of [.8, .65, .5]) { blob = await canvasBlob(canvas, mime, quality); if (blob.size <= IMAGE_BYTES) break }
  }
  if (blob.size > IMAGE_BYTES) throw new Error('导出图片超过 5MB，请在“尺寸”中缩小后保存')
  const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
  return new File([blob], `community-image.${extension}`, { type: blob.type })
}
