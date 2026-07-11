import { AnonymousVisitor } from '@shared/services/visitor.types';
import { Admin } from '../modules/admin/admin.types';

declare global {
  namespace Express {
    interface Request {
      visitor?: AnonymousVisitor;
      admin?: Admin;
    }
  }
}

export {};
