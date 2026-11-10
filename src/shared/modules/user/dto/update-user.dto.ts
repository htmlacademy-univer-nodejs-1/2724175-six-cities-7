import { User } from '../../../types/index.js';

export type UpdateUserDto = Partial<Pick<User, 'name' | 'avatar' | 'type'>>;
