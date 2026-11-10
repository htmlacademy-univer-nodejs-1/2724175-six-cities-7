import { inject, injectable } from 'inversify';
import { Model, Types } from 'mongoose';
import { Component } from '../../di/component.js';
import { Logger } from '../../libs/logger/logger.interface.js';
import { CityName } from '../../types/index.js';
import { OfferService } from './offer-service.interface.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { OfferDocument, OfferEntity } from './offer.model.js';
import { CommentEntity } from '../comment/comment.model.js';
import { UserEntity } from '../user/user.model.js';

@injectable()
export class DefaultOfferService implements OfferService {
  constructor(
    @inject(Component.OfferModel) private readonly offerModel: Model<Omit<OfferEntity, '_id' | 'id' | 'author'> & { author: Types.ObjectId }>,
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.CommentModel) private readonly commentModel: Model<CommentEntity>,
    @inject(Component.UserModel) private readonly userModel: Model<UserEntity>
  ) {}

  public async create(offer: CreateOfferDto): Promise<OfferDocument> {
    const { title, description, postDate, city, previewImage, images, isPremium,
      housingType, roomsCount, guestsCount, price, amenities, location, author } = offer;
    const document = await this.offerModel.create({
      title, description, postDate, city, previewImage, images, isPremium,
      housingType, roomsCount, guestsCount, price, amenities, location, author,
      rating: 0, ratingSum: 0, commentCount: 0
    }) as unknown as OfferDocument;
    this.logger.info('Предложение создано.');
    return document;
  }

  public async findById(id: string): Promise<OfferDocument | null> {
    return this.offerModel.findById(id).populate('author', '-password').exec() as unknown as Promise<OfferDocument | null>;
  }

  public async find(count = 60): Promise<OfferDocument[]> {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error('Количество предложений должно быть положительным целым числом.');
    }
    return this.offerModel.find().sort({ postDate: -1, _id: -1 }).limit(count)
      .populate('author', '-password').exec() as unknown as Promise<OfferDocument[]>;
  }

  public async findPremiumByCity(city: CityName): Promise<OfferDocument[]> {
    return this.offerModel.find({ 'city.name': city, isPremium: true })
      .sort({ postDate: -1, _id: -1 }).limit(3).populate('author', '-password').exec() as unknown as Promise<OfferDocument[]>;
  }

  public async findFavorites(userId: string): Promise<OfferDocument[]> {
    const user = await this.userModel.findOne({ _id: userId }).exec();
    return this.offerModel.find({ _id: { $in: user?.favorites ?? [] } })
      .sort({ postDate: -1, _id: -1 }).populate('author', '-password').exec() as unknown as Promise<OfferDocument[]>;
  }

  public async updateById(id: string, dto: UpdateOfferDto): Promise<OfferDocument | null> {
    const { title, description, city, previewImage, images, isPremium,
      housingType, roomsCount, guestsCount, price, amenities, location } = dto;
    return this.offerModel.findOneAndUpdate({ _id: id }, { $set: {
      title, description, city, previewImage, images, isPremium,
      housingType, roomsCount, guestsCount, price, amenities, location
    } }, { new: true }).populate('author', '-password').exec() as unknown as Promise<OfferDocument | null>;
  }

  public async deleteById(id: string): Promise<OfferDocument | null> {
    const document = await this.offerModel.findOneAndDelete({ _id: id }).exec() as unknown as OfferDocument | null;
    await this.commentModel.deleteMany({ offer: new Types.ObjectId(id) }).exec();
    await this.userModel.updateMany({}, { $pull: { favorites: new Types.ObjectId(id) } }).exec();
    return document;
  }

  public async exists(id: string): Promise<boolean> {
    return Boolean(await this.offerModel.exists({ _id: id }));
  }

  public async isAuthor(id: string, userId: string): Promise<boolean> {
    return Boolean(await this.offerModel.exists({ _id: id, author: userId }));
  }
}
