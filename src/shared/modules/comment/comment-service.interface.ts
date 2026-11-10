import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CommentDocument } from './comment.model.js';

export interface CommentService {
  create(dto: CreateCommentDto): Promise<CommentDocument>;
  findByOfferId(offerId: string): Promise<CommentDocument[]>;
}
