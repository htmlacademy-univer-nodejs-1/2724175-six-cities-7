import { User } from '../../types/index.js';
import { UserDocument } from './user.model.js';

export interface UserService {
  create(input: User, salt: string): Promise<UserDocument>;
  findById(id: string): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
}
