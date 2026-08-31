export interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

export interface UploadOptions {
  uploadedBy: string
  visibility: 'public' | 'private'
  catalogMedia?: boolean
  trustedSvg?: boolean
}

export interface StoredFile {
  id: string
  originalName: string
  mimeType: string
  size: number
  checksum: string
}

export abstract class StorageService {
  abstract upload(file: UploadedFile, options: UploadOptions): Promise<StoredFile>
  abstract getSignedUrl(fileId: string): Promise<string>
  abstract delete(fileId: string): Promise<void>
  abstract exists(fileId: string): Promise<boolean>
  abstract writable(): Promise<boolean>
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE')
