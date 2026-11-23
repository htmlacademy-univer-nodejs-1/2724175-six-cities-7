import { StatusCodes } from 'http-status-codes';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';

export class ImagesController extends Controller {
  constructor() {
    super();
    this.addRoute({ method: 'post', path: '/', handler: this.upload });
  }

  private async upload(): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Загрузка изображений пока недоступна.');
  }
}
