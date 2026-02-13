// Passport/Express augmentation used throughout routes.
declare global {
  namespace Express {
    interface User {
      steamId?: string;
      provider?: string;
      [key: string]: unknown;
    }
    interface Request {
      user?: User;
    }
  }
}

export {};

