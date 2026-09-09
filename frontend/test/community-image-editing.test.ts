import { describe, expect, it } from 'vitest'
import { boundedSize, imageHeaderSize, validateImageFile } from '../src/community/imageEditing'

describe('图片编辑输入与像素边界', () => {
  it('限制空文件、实际字节数、类型与后缀，允许同一文件重复选择', () => {
    for (const file of [new File([], 'a.png', { type: 'image/png' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' }), new File(['x'], 'a.svg', { type: 'image/svg+xml' }), new File(['x'], 'a.jpg', { type: 'image/png' })]) expect(() => validateImageFile(file)).toThrow()
    const file = new File(['x'], 'a.PNG', { type: 'image/png' })
    expect(() => { validateImageFile(file); validateImageFile(file) }).not.toThrow()
  })
  it('大图保持比例缩小，普通图不放大', () => {
    expect(boundedSize(8192, 4096)).toEqual({ width: 4096, height: 2048 })
    expect(boundedSize(800, 24000)).toEqual({ width: 137, height: 4096 })
    expect(boundedSize(200, 300)).toEqual({ width: 200, height: 300 })
  })
  it('解码前读取 PNG/JPEG/WebP 尺寸并拒绝不匹配文件', () => {
    const png = new Uint8Array(24); png.set([137, 80, 78, 71, 13, 10, 26, 10]); png.set([73, 72, 68, 82], 12)
    const view = new DataView(png.buffer); view.setUint32(16, 8192); view.setUint32(20, 4096)
    expect(imageHeaderSize(png.buffer, 'image/png')).toEqual({ width: 8192, height: 4096 })
    const jpeg = new Uint8Array([255,216,255,192,0,7,8,1,44,0,200,0])
    expect(imageHeaderSize(jpeg.buffer, 'image/jpeg')).toEqual({ width: 200, height: 300 })
    const webp = new Uint8Array(30); webp.set(new TextEncoder().encode('RIFF'), 0); webp.set(new TextEncoder().encode('WEBPVP8X'), 8); webp[24] = 199; webp[27] = 99
    expect(imageHeaderSize(webp.buffer, 'image/webp')).toEqual({ width: 200, height: 100 })
    webp[20] = 2; expect(() => imageHeaderSize(webp.buffer, 'image/webp')).toThrow('动画')
    expect(() => imageHeaderSize(png.buffer, 'image/jpeg')).toThrow()
    expect(() => imageHeaderSize(new ArrayBuffer(1), 'image/png')).toThrow()
  })
})
