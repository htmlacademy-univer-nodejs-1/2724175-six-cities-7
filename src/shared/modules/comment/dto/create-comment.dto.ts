import { Types } from 'mongoose';

export type CreateCommentDto = {
  text: string;
  rating: number;
  author: Types.ObjectId;
  offer: Types.ObjectId;
};
