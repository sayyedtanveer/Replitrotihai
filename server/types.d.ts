
import "express-session";

declare module "express-session" {
  interface SessionData {
    passport?: {
      user?: any;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: string;
      expires_at: number;
    }
  }
}
