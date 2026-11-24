import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { ValidateDtoMiddleware } from '../../shared/libs/rest/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../../shared/libs/rest/validate-object-id.middleware.js';
import { CommentService } from '../../shared/modules/comment/comment-service.interface.js';
import { OfferService } from '../../shared/modules/offer/offer-service.interface.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { CreateCommentBody } from './comment-request.dto.js';
import { commentResponse } from './responses.js';

export class CommentsController extends Controller {
  constructor(private readonly comments: CommentService, private readonly offers: OfferService, private readonly users: UserService) {
    super();
    const path = '/:offerId/comments';
    const offerId = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({ method: 'get', path, handler: this.index, middleware: [offerId] });
    this.addRoute({ method: 'post', path, handler: this.create, middleware: [offerId, new ValidateDtoMiddleware(CreateCommentBody)] });
  }

  private async index(request: Request, response: Response): Promise<void> {
    const { offerId } = request.params;
    await this.ensureOfferExists(offerId);
    this.ok(response, (await this.comments.findByOfferId(offerId)).map(commentResponse));
  }

  private async create(request: Request<Record<string, string>, unknown, CreateCommentBody>, response: Response): Promise<void> {
    const { offerId } = request.params;
    const { text, rating, authorId } = request.body;
    await this.ensureOfferExists(offerId);
    if (!await this.users.findById(authorId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Автор не найден.');
    }
    const comment = await this.comments.create({ text, rating, offer: new Types.ObjectId(offerId), author: new Types.ObjectId(authorId) });
    this.created(response, commentResponse(comment));
  }

  private async ensureOfferExists(offerId: string): Promise<void> {
    if (!await this.offers.exists(offerId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
  }
}
