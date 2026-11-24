import { IsEmail, IsEnum, IsUrl, Length, Matches, ValidateIf } from 'class-validator';
import { USER_LIMITS } from '../../shared/constants/offer-limits.js';
import { UserType } from '../../shared/types/index.js';

export class LoginBody {
  @IsEmail()
  public email!: string;

  @Length(USER_LIMITS.password.min, USER_LIMITS.password.max)
  public password!: string;
}

export class RegisterBody extends LoginBody {
  @Length(USER_LIMITS.name.min, USER_LIMITS.name.max)
  public name!: string;

  @IsEnum(UserType)
  public type!: UserType;

  @ValidateIf((_body: object, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['http', 'https'], 'require_protocol': true, 'require_tld': false })
  @Matches(/^https?:\/\/[^/?#]+\/[^?#]*\.(?:jpg|png)(?:[?#].*)?$/i)
  public avatarPath?: string;
}
