import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128)

  // opcional: requerir al menos una mayúscula, minúscula y número

  // @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'Password too weak' })
  password: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  fullName?: string;
}

