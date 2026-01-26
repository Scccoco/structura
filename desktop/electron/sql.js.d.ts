declare module 'sql.js' {
    interface SqlJsStatic {
        Database: typeof Database;
    }

    interface Database {
        run(sql: string, params?: any[]): void;
        exec(sql: string): QueryExecResult[];
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
    }

    interface Statement {
        bind(params?: any[]): boolean;
        step(): boolean;
        getAsObject(params?: any): Record<string, any>;
        get(params?: any): any[];
        reset(): void;
        free(): void;
    }

    interface QueryExecResult {
        columns: string[];
        values: any[][];
    }

    interface SqlJsOptions {
        locateFile?: (filename: string) => string;
    }

    export default function initSqlJs(options?: SqlJsOptions): Promise<SqlJsStatic>;
    export { Database, Statement, QueryExecResult };
}
