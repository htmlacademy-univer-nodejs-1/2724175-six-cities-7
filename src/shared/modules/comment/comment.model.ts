import { defaultClasses, DocumentType, modelOptions, prop, Ref } from '@typegoose/typegoose';
import { UserEntity } from '../user/user.model.js';
import { OfferEntity } from '../offer/offer.model.js';

export interface CommentEntity extends defaultClasses.Base {}

@modelOptions({ schemaOptions: { collection: 'comments', timestamps: true } })
export class CommentEntity extends defaultClasses.TimeStamps {
  @prop({ required: true })
  public text!: string;

  @prop({ required: true })
  public rating!: number;

  @prop({ required: true, default: Date.now })
  public postDate!: Date;

  @prop({ required: true, ref: () => UserEntity })
  public author!: Ref<UserEntity>;

  @prop({ required: true, ref: () => OfferEntity, index: true })
  public offer!: Ref<OfferEntity>;
}

export type CommentDocument = DocumentType<CommentEntity>;
