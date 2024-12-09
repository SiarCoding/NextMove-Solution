import { Session } from 'express-session';
import { User } from './types';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

declare module 'express' {
  interface Request {
    session: Session & {
      userId?: number;
    };
    user?: User;
  }
}
