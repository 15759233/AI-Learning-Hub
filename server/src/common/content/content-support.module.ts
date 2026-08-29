import { Module } from '@nestjs/common'
import { ContentSupportService } from './content-support.service'

@Module({ providers: [ContentSupportService], exports: [ContentSupportService] })
export class ContentSupportModule {}
