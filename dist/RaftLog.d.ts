export declare enum RaftLogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    VERBOSE = 5
}
export type RaftLogFn = (logLevel: RaftLogLevel, msg: string) => void;
export default class RaftLog {
    static _logListener: RaftLogFn | null;
    static _logLevel: RaftLogLevel;
    static format(msg: string): string;
    static debug(msg: string): void;
    static info(msg: string): void;
    static warn(msg: string): void;
    static error(msg: string): void;
    static verbose(msg: string): void;
    static setLogListener(listener: RaftLogFn | null): void;
    static setLogLevel(logLevel: RaftLogLevel): void;
    static doLogging(logLevel: RaftLogLevel, msg: string): boolean;
}
