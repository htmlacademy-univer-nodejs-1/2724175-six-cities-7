import { Expose, plainToInstance, Type } from 'class-transformer';
import { OfferDocument } from '../../shared/modules/offer/offer.model.js';
import { UserEntity } from '../../shared/modules/user/user.model.js';

class UserResponse {
  @Expose() public id!: string;
  @Expose() public name!: string;
  @Expose() public email!: string;
  @Expose() public avatarPath!: string;
  @Expose() public type!: string;
}

class OfferPreviewResponse {
  @Expose() public id!: string;
  @Expose() public title!: string;
  @Expose() public price!: number;
  @Expose() public housingType!: string;
  @Expose() public isFavorite!: boolean;
  @Expose() public postDate!: Date;
  @Expose() public city!: string;
  @Expose() public previewImage!: string;
  @Expose() public isPremium!: boolean;
  @Expose() public rating!: number;
  @Expose() public commentCount!: number;
}

class LocationResponse {
  @Expose() public latitude!: number;
  @Expose() public longitude!: number;
}

class OfferResponse extends OfferPreviewResponse {
  @Expose() public description!: string;
  @Expose() public images!: string[];
  @Expose() public roomsCount!: number;
  @Expose() public guestsCount!: number;
  @Expose() public amenities!: string[];
  @Expose() @Type(() => UserResponse) public author!: UserResponse;
  @Expose() @Type(() => LocationResponse) public location!: LocationResponse;
}

const options = { excludeExtraneousValues: true };

export function userResponse(user: Pick<UserEntity, 'id' | 'name' | 'email' | 'avatar' | 'type'>): UserResponse {
  return plainToInstance(UserResponse, {
    id: user.id, name: user.name, email: user.email, type: user.type,
    avatarPath: user.avatar || '/static/default-avatar.jpg'
  }, options);
}

export function offerPreview(offer: OfferDocument, isFavorite: boolean): OfferPreviewResponse {
  return plainToInstance(OfferPreviewResponse, {
    ...offer.toObject(), id: offer.id, city: offer.city.name, isFavorite
  }, options);
}

export function offerResponse(offer: OfferDocument, isFavorite: boolean): OfferResponse {
  return plainToInstance(OfferResponse, {
    ...offer.toObject(), ...offerPreview(offer, isFavorite), author: userResponse(offer.author as UserEntity)
  }, options);
}
