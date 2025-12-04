import { IsString, Length, Matches } from 'class-validator';

export class JoinByCodeDto {
  @IsString()
  @Length(8, 8)
  @Matches(/^[A-Z0-9]{8}$/, {
    message: 'Invalid invite code format',
  })
  inviteCode: string;
}

