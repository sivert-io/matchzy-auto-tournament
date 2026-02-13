// Local, strongly-typed module declarations.
// These exist because the workspace tooling currently cannot install `@types/*`.

declare module 'express-session' {
  import type { RequestHandler } from 'express';

  export interface CookieOptions {
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
    maxAge?: number;
  }

  export interface Store {
    // Minimal surface area needed by connect-pg-simple and our app.
    get?(sid: string, cb: (err: unknown, session?: unknown | null) => void): void;
    set?(sid: string, session: unknown, cb?: (err?: unknown) => void): void;
    destroy?(sid: string, cb?: (err?: unknown) => void): void;
  }

  export interface SessionOptions {
    store?: Store;
    secret: string | string[];
    resave?: boolean;
    saveUninitialized?: boolean;
    cookie?: CookieOptions;
  }

  export default function session(options: SessionOptions): RequestHandler;
}

declare module 'connect-pg-simple' {
  import type session from 'express-session';
  import type { Store } from 'express-session';

  export interface PgSessionOptions {
    conString?: string;
    tableName?: string;
    createTableIfMissing?: boolean;
  }

  export type PgSessionStore = Store;

  export interface PgSessionStoreConstructor {
    new (options?: PgSessionOptions): PgSessionStore;
  }

  export default function connectPgSimple(sessionMiddleware: typeof session): PgSessionStoreConstructor;
}

declare module 'gamedig' {
  export type QueryOptions = {
    type: string;
    host: string;
    port?: number;
  };

  export type QueryResult = unknown;

  export class GameDig {
    static query(options: QueryOptions): Promise<QueryResult>;
  }
}

