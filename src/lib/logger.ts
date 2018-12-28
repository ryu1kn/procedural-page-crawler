
export interface Logger {
    log: (...args: any[]) => void;
}

export class NullLogger implements Logger {
    log(...args: any[]): void {}
}
