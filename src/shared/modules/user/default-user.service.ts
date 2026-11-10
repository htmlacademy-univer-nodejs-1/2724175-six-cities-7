import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { inject, injectable } from 'inversify';
import { ReturnModelType } from '@typegoose/typegoose';
import { Component } from '../../di/component.js';
import { Logger } from '../../libs/logger/logger.interface.js';
import { Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { OfferEntity } from '../offer/offer.model.js';
import { UserService } from './user-service.interface.js';
import { UserDocument, UserEntity } from './user.model.js';

const scryptAsync = promisify(scrypt);

@injectable()
export class DefaultUserService implements UserService {
  constructor(
    @inject(Component.UserModel) private readonly userModel: ReturnModelType<typeof UserEntity>,
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.OfferModel) private readonly offerModel: ReturnModelType<typeof OfferEntity>
  ) {}

  public async create(input: CreateUserDto, salt: string): Promise<UserDocument> {
    const password = (await scryptAsync(input.password, salt, 64) as Buffer).toString('hex');
    await this.userModel.init();
    const { name, email, avatar, type } = input;
    const user = await this.userModel.create({ name, email, avatar, type, password }) as unknown as UserDocument;
    this.logger.info('Пользователь создан.');
    return user;
  }

  public async updateById(id: string, dto: UpdateUserDto): Promise<UserDocument | null> {
    const { name, avatar, type } = dto;
    return this.userModel.findOneAndUpdate({ _id: id }, { $set: { name, avatar, type } },
      { new: true }).exec() as unknown as Promise<UserDocument | null>;
  }

  public async addToFavorites(userId: string, offerId: string): Promise<UserDocument | null> {
    if (!await this.offerModel.exists({ _id: offerId })) {
      throw new Error('Предложение не найдено.');
    }
    return this.userModel.findOneAndUpdate({ _id: userId },
      { $addToSet: { favorites: new Types.ObjectId(offerId) } }, { new: true }).exec() as unknown as Promise<UserDocument | null>;
  }

  public async removeFromFavorites(userId: string, offerId: string): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate({ _id: userId },
      { $pull: { favorites: new Types.ObjectId(offerId) } }, { new: true }).exec() as unknown as Promise<UserDocument | null>;
  }

  public async findById(id: string): Promise<UserDocument | null> {
    const result = await this.userModel.findOne({ _id: id }).exec();
    return result ? (result as unknown as UserDocument) : null;
  }

  public async findByEmail(email: string): Promise<UserDocument | null> {
    const result = await this.userModel.findOne({ email }).exec();
    return result ? (result as unknown as UserDocument) : null;
  }
}
