import { Types } from 'mongoose';
import { Offer } from '../../../types/index.js';

export type CreateOfferDto = Omit<Offer, 'author' | 'postDate' | 'rating' | 'commentCount' | 'isFavorite'> & {
  author: Types.ObjectId;
  postDate?: Date;
};
