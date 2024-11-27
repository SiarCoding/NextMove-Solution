declare module 'express-session' {
  interface Session {
    userId: number;
  }
}
