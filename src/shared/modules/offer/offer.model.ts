import { defaultClasses, DocumentType, modelOptions, prop, Ref } from '@typegoose/typegoose';
import { Amenity, CITY_LOCATIONS, CityName, HousingType } from '../../types/index.js';
import { UserEntity } from '../user/user.model.js';

@modelOptions({ schemaOptions: { _id: false } })
export class LocationEntity {
  @prop({ required: true })
  public latitude!: number;

  @prop({ required: true })
  public longitude!: number;
}

@modelOptions({ schemaOptions: { _id: false } })
export class CityEntity {
  @prop({ required: true, type: () => String, enum: Object.keys(CITY_LOCATIONS) })
  public name!: CityName;

  @prop({ required: true, type: () => LocationEntity })
  public location!: LocationEntity;
}

export interface OfferEntity extends defaultClasses.Base {}

@modelOptions({ schemaOptions: { collection: 'offers', timestamps: true } })
export class OfferEntity extends defaultClasses.TimeStamps {
  @prop({ required: true })
  public title!: string;

  @prop({ required: true })
  public description!: string;

  @prop({ required: true, default: Date.now })
  public postDate!: Date;

  @prop({ required: true, type: () => CityEntity })
  public city!: CityEntity;

  @prop({ required: true })
  public previewImage!: string;

  @prop({ required: true, type: () => [String] })
  public images!: string[];

  @prop({ required: true })
  public isPremium!: boolean;

  @prop({ required: true, default: 0 })
  public rating!: number;

  @prop({ required: true, default: 0 })
  public ratingSum!: number;

  @prop({ required: true, type: () => String, enum: HousingType })
  public housingType!: HousingType;

  @prop({ required: true })
  public roomsCount!: number;

  @prop({ required: true })
  public guestsCount!: number;

  @prop({ required: true })
  public price!: number;

  @prop({ required: true, type: () => [String], enum: Amenity })
  public amenities!: Amenity[];

  @prop({ required: true, ref: () => UserEntity })
  public author!: Ref<UserEntity>;

  @prop({ required: true, default: 0 })
  public commentCount!: number;

  @prop({ required: true, type: () => LocationEntity })
  public location!: LocationEntity;
}

export type OfferDocument = DocumentType<OfferEntity>;
