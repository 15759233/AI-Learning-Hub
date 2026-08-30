import { Module } from '@nestjs/common'
import { ContentReferenceService } from './content-reference.service'
@Module({ providers: [ContentReferenceService], exports: [ContentReferenceService] })
export class ContentReferenceModule {}
