import { inject, injectable } from 'inversify';
import { Model, Types } from 'mongoose';
import { Component } from '../../di/component.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CommentDocument, CommentEntity } from './comment.model.js';
import { CommentService } from './comment-service.interface.js';
import { OfferEntity } from '../offer/offer.model.js';

@injectable()
export class DefaultCommentService implements CommentService {
  constructor(
    @inject(Component.CommentModel) private readonly commentModel: Model<Omit<CommentEntity, '_id' | 'id' | 'author' | 'offer'> & { author: Types.ObjectId; offer: Types.ObjectId }>,
    @inject(Component.OfferModel) private readonly offerModel: Model<Omit<OfferEntity, '_id' | 'id' | 'author'> & { author: Types.ObjectId }>
  ) {}

  public async create(dto: CreateCommentDto): Promise<CommentDocument> {
    if (!await this.offerModel.exists({ _id: dto.offer })) {
      throw new Error('Предложение не найдено.');
    }
    const { text, rating, author, offer } = dto;
    const document = await this.commentModel.create({ text, rating, author, offer }) as unknown as CommentDocument;
    try {
      const result = await this.offerModel.updateOne({ _id: offer }, [
        { $set: {
          ratingSum: { $add: [{ $ifNull: ['$ratingSum', 0] }, rating] },
          commentCount: { $add: [{ $ifNull: ['$commentCount', 0] }, 1] }
        } },
        { $set: { rating: { $divide: [{ $floor: { $add: [
          { $multiply: [{ $divide: ['$ratingSum', '$commentCount'] }, 10] }, 0.5]
        } }, 10] } } }
      ]).exec();
      if (!result.matchedCount) {
        throw new Error('Предложение не найдено.');
      }
    } catch (error) {
      await this.commentModel.deleteOne({ _id: document._id }).exec();
      throw error;
    }
    await document.populate('author', '-password');
    return document;
  }

  public async findByOfferId(offerId: string): Promise<CommentDocument[]> {
    return this.commentModel.find({ offer: offerId }).sort({ postDate: -1, _id: -1 })
      .limit(50).populate('author', '-password').exec() as unknown as Promise<CommentDocument[]>;
  }
}
