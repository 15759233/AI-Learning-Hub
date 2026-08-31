import { Module } from '@nestjs/common'
import { ContentReferenceService } from './content-reference.service'
import { MediaModule } from '../../modules/media/media.module'
@Module({ imports: [MediaModule], providers: [ContentReferenceService], exports: [ContentReferenceService] })
export class ContentReferenceModule {}
