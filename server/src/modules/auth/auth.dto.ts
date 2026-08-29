import { IsEmail, IsString, Length } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @Length(8, 128)
  password!: string
}

export class UpdateProfileDto {
  @IsString()
  @Length(1, 40)
  displayName!: string
}

export class WechatCodeDto {
  @IsString()
  @Length(4, 256)
  code!: string
}
