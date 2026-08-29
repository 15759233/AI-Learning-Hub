import { IsArray } from 'class-validator'

export class ReorderDto {
  @IsArray() items!: Array<{ id: string; sortOrder: number }>
}
