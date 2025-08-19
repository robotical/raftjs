/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftLog
// Communications Library
//
// Rob Dobson & Chris Greening 2020-2022
// (C) 2020-2022
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export enum RaftLogLevel {
  NONE,
  ERROR,
  WARN,
  INFO,
  DEBUG,
  VERBOSE
}

export type RaftLogFn = (logLevel: RaftLogLevel, msg: string) => void;

export default class RaftLog {
  static _logListener: RaftLogFn | null = null;
  static _logLevel = RaftLogLevel.DEBUG;

  static format(msg: string): string {
    return (Date.now()/1000).toFixed(3).toString() + " " + msg;
  }

  static debug(msg: string) {
    if (!this.doLogging(RaftLogLevel.DEBUG, msg))
      console.debug(RaftLog.format(msg));
  }

  static info(msg: string) {
    if (!this.doLogging(RaftLogLevel.INFO, msg))
      console.info(RaftLog.format(msg));
  }

  static warn(msg: string) {
    if (!this.doLogging(RaftLogLevel.WARN, msg))
      console.warn(RaftLog.format(msg));
  }

  static error(msg: string) {
    if (!this.doLogging(RaftLogLevel.ERROR, msg))
      console.warn(RaftLog.format(msg));
  }

  static verbose(msg: string) {
    if (!this.doLogging(RaftLogLevel.VERBOSE, msg))
      console.debug(RaftLog.format(msg));
  }

  static setLogListener(listener: RaftLogFn | null) {
    this._logListener = listener;
  }

  static setLogLevel(logLevel: RaftLogLevel): void {
    this._logLevel = logLevel;
  }

  static doLogging(logLevel: RaftLogLevel, msg: string): boolean {
    if (this._logListener) {
      this._logListener(logLevel, msg)
      return true;
    } 
    return this._logLevel < logLevel;
  }  
}
