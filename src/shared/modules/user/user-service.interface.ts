import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDocument } from './user.model.js';

export interface UserService {
  create(input: CreateUserDto, salt: string): Promise<UserDocument>;
  findById(id: string): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
  updateById(id: string, dto: UpdateUserDto): Promise<UserDocument | null>;
  addToFavorites(userId: string, offerId: string): Promise<UserDocument | null>;
  removeFromFavorites(userId: string, offerId: string): Promise<UserDocument | null>;
}
