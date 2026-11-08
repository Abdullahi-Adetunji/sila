declare module "@electric-sql/pglite" {
  export interface QueryResult<T = unknown> {
    rows: T[];
  }
  export class PGlite {
    constructor(dataDir?: string | undefined);
    exec(sql: string): Promise<unknown>;
    query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    close(): Promise<void>;
  }
}
