import 'express-session';
import { Session } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      email: string;
    };
  }
}

declare module 'express' {
  interface Request {
    session: Session & Partial<SessionData>;
  }
}
