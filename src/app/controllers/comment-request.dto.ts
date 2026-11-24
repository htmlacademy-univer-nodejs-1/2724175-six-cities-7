import { IsInt, IsMongoId, Length, Max, Min } from 'class-validator';
import { OFFER_LIMITS } from '../../shared/constants/offer-limits.js';

export class CreateCommentBody {
  @Length(5, 1024)
  public text!: string;

  @IsInt()
  @Min(OFFER_LIMITS.rating.min)
  @Max(OFFER_LIMITS.rating.max)
  public rating!: number;

  @IsMongoId()
  public authorId!: string;
}
