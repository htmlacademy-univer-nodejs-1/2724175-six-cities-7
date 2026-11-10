import { defaultClasses, DocumentType, modelOptions, prop } from '@typegoose/typegoose';
import { User, UserType } from '../../types/index.js';
import { Types } from 'mongoose';

export interface UserEntity extends defaultClasses.Base {}

@modelOptions({ schemaOptions: { collection: 'users', timestamps: true } })
export class UserEntity extends defaultClasses.TimeStamps implements User {
  @prop({ required: true })
  public name!: string;

  @prop({ required: true, unique: true })
  public email!: string;

  @prop()
  public avatar?: string;

  @prop({ required: true })
  public password!: string;

  @prop({ ref: 'OfferEntity', type: () => [Types.ObjectId], default: [] })
  public favorites!: Types.ObjectId[];

  @prop({ required: true, type: () => String, enum: UserType })
  public type!: UserType;
}

export type UserDocument = DocumentType<UserEntity>;
