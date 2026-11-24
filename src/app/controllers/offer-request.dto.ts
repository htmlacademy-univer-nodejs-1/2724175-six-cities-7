import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize, ArrayUnique, ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsEnum, IsIn, IsInt,
  IsMongoId, IsNumber, IsObject, IsUrl, Length, Matches, Max, Min, ValidateIf, ValidateNested
} from 'class-validator';
import { OFFER_LIMITS } from '../../shared/constants/offer-limits.js';
import { Amenity, CITY_LOCATIONS, CityName, HousingType } from '../../shared/types/index.js';

const cities = Object.keys(CITY_LOCATIONS);
const urlOptions = { protocols: ['http', 'https'], 'require_protocol': true, 'require_tld': false };

class LocationDto {
  @IsDefined()
  @IsNumber()
  @Min(OFFER_LIMITS.latitude.min)
  @Max(OFFER_LIMITS.latitude.max)
  public latitude!: number;

  @IsDefined()
  @IsNumber()
  @Min(OFFER_LIMITS.longitude.min)
  @Max(OFFER_LIMITS.longitude.max)
  public longitude!: number;
}

export class UpdateOfferBody {
  @Length(OFFER_LIMITS.title.min, OFFER_LIMITS.title.max)
  public title!: string;

  @Length(OFFER_LIMITS.description.min, OFFER_LIMITS.description.max)
  public description!: string;

  @IsIn(cities)
  public city!: CityName;

  @IsUrl(urlOptions)
  @Matches(/^https?:\/\//i)
  public previewImage!: string;

  @IsArray()
  @ArrayMinSize(OFFER_LIMITS.imagesCount)
  @ArrayMaxSize(OFFER_LIMITS.imagesCount)
  @IsUrl(urlOptions, { each: true })
  @Matches(/^https?:\/\//i, { each: true })
  public images!: string[];

  @IsBoolean()
  public isPremium!: boolean;

  @IsEnum(HousingType)
  public housingType!: HousingType;

  @IsInt()
  @Min(OFFER_LIMITS.rooms.min)
  @Max(OFFER_LIMITS.rooms.max)
  public roomsCount!: number;

  @IsInt()
  @Min(OFFER_LIMITS.guests.min)
  @Max(OFFER_LIMITS.guests.max)
  public guestsCount!: number;

  @IsInt()
  @Min(OFFER_LIMITS.price.min)
  @Max(OFFER_LIMITS.price.max)
  public price!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(Amenity, { each: true })
  public amenities!: Amenity[];

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  public location!: LocationDto;
}

export class CreateOfferBody extends UpdateOfferBody {
  @IsMongoId()
  public authorId!: string;
}

export class OfferListQuery {
  @ValidateIf((_query: object, value: unknown) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  public limit?: number;
}

export class PremiumParams {
  @IsIn(cities)
  public city!: CityName;
}
