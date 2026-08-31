import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { extname } from 'node:path'
import { crc32 } from 'node:zlib'
import sharp from 'sharp'
import type { UploadedFile } from '../storage/storage.types'

const invalid = () => { throw new BadRequestException('图片内容、类型或尺寸无效；仅支持静态 PNG、JPEG、WebP 与受信任 SVG') }
const limits = (width: number, height: number) => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width > 8192 || height > 8192 || width * height > 32_000_000) invalid()
  return { width, height }
}
function inspectEnvelope(buffer: Buffer, format: string) {
  if (format === 'jpeg') {
    if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8 || buffer.readUInt16BE(buffer.length - 2) !== 0xffd9) invalid()
  } else if (format === 'webp') {
    if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP' || buffer.readUInt32LE(4) + 8 !== buffer.length) invalid()
  } else if (format === 'png') {
    if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) invalid()
    let offset = 8, ended = false
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset), next = offset + 12 + length
      if (next > buffer.length || crc32(buffer.subarray(offset + 4, next - 4)) !== buffer.readUInt32BE(next - 4)) invalid()
      const kind = buffer.toString('ascii', offset + 4, offset + 8)
      if (offset === 8 && (kind !== 'IHDR' || length !== 13)) invalid()
      if (kind === 'IEND') { if (length || next !== buffer.length) invalid(); ended = true }
      offset = next
    }
    if (!ended || offset !== buffer.length) invalid()
  }
}

/** SVG 只接收可编辑基础矢量的封闭子集，不“清洗后信任”任意浏览器可执行 XML。 */
export function inspectSvg(buffer: Buffer) {
  const xml = buffer.toString('utf8')
  if (!buffer.equals(Buffer.from(xml)) || /[&]|<!|<\?|url\s*\(/i.test(xml)) invalid()
  const tags = new Set(['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon'])
  const attrs = new Set(['xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform'])
  const stack: string[] = []
  let end = 0, root = false, size: ReturnType<typeof limits> | undefined
  for (const match of xml.matchAll(/<([^>]+)>/g)) {
    if (xml.slice(end, match.index).trim()) invalid()
    end = match.index! + match[0].length
    const tag = match[1]!.match(/^(\/?)([A-Za-z]+)([\s\S]*?)(\/?)$/)
    if (!tag || !tags.has(tag[2]!)) invalid()
    const name = tag![2]!, tail = tag![3]!
    if (tag![1]) { if (tail.trim() || tag![4] || stack.pop() !== name) invalid(); continue }
    if (!root && name !== 'svg' || root && !stack.length || root && name === 'svg') invalid()
    const values: Record<string, string> = {}
    let last = 0
    for (const attr of tail.matchAll(/\s+([A-Za-z][A-Za-z-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      if (tail.slice(last, attr.index).trim() || !attrs.has(attr[1]!) || attr[1]! in values) invalid()
      last = attr.index! + attr[0].length
      const value = attr[2] ?? attr[3]!
      if (attr[1] === 'xmlns' ? value !== 'http://www.w3.org/2000/svg' : !/^[\w\s.,#()+%-]*$/.test(value)) invalid()
      values[attr[1]!] = value
    }
    if (tail.slice(last).trim()) invalid()
    if (!root) {
      const box = values.viewBox?.trim().split(/[,\s]+/).map(Number)
      size = limits(Number(values.width || box?.[2]), Number(values.height || box?.[3]))
      root = true
    }
    if (!tag![4]) stack.push(name)
  }
  if (!root || stack.length || xml.slice(end).trim() || !size) invalid()
  return size!
}

export async function inspectMediaImage(file: UploadedFile, trustedSvg = false) {
  const b = file.buffer, extension = extname(file.originalname).toLowerCase()
  if (!b.length || b.length !== file.size || b.length > 5 * 1024 * 1024) throw new BadRequestException('封面图片必须在1字节到5MB之间')
  if (extension === '.svg') {
    if (!trustedSvg) throw new ForbiddenException('SVG 仅允许受信任管理员上传')
    if (file.mimetype !== 'image/svg+xml') invalid()
    return inspectSvg(b)
  }
  const format = ({ '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.webp': 'webp' } as Record<string, string>)[extension]
  if (!format || file.mimetype !== `image/${format}`) invalid()
  try {
    inspectEnvelope(b, format)
    const image = sharp(b, { failOn: 'warning', limitInputPixels: 32_000_000, unlimited: false })
    const metadata = await image.metadata()
    if (metadata.format !== format || (metadata.pages || 1) !== 1) invalid()
    const size = limits(metadata.width!, metadata.height!)
    // 完整解码才能拒绝“合法头+截断像素”；仅 metadata() 不足以验证上传。
    await image.raw().toBuffer()
    return size
  } catch { return invalid() }
}
