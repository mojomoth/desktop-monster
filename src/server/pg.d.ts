// ponytail: only the 3 members we use; swap for @types/pg if this grows.
declare module 'pg' {
  export class Pool {
    constructor(cfg: { connectionString: string; ssl?: { rejectUnauthorized: boolean } });
    query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  }
}
