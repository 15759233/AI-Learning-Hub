import { Module } from '@nestjs/common'
import { ContentSupportService } from './content-support.service'
import { MediaModule } from '../../modules/media/media.module'

@Module({ imports: [MediaModule], providers: [ContentSupportService], exports: [ContentSupportService] })
export class ContentSupportModule {}
