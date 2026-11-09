import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { inject, injectable } from 'inversify';
import { ReturnModelType } from '@typegoose/typegoose';
import { Component } from '../../di/component.js';
import { Logger } from '../../libs/logger/logger.interface.js';
import { User } from '../../types/index.js';
import { UserService } from './user-service.interface.js';
import { UserDocument, UserEntity } from './user.model.js';

const scryptAsync = promisify(scrypt);

@injectable()
export class DefaultUserService implements UserService {
  constructor(
    @inject(Component.UserModel) private readonly userModel: ReturnModelType<typeof UserEntity>,
    @inject(Component.Logger) private readonly logger: Logger
  ) {}

  public async create(input: User, salt: string): Promise<UserDocument> {
    const password = (await scryptAsync(input.password, salt, 64) as Buffer).toString('hex');
    await this.userModel.init();
    const user = await this.userModel.create({ ...input, password }) as unknown as UserDocument;
    this.logger.info('User created');
    return user;
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
