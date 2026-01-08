/* eslint-disable eslint-comments/disable-enable-pair, @typescript-eslint/no-explicit-any, no-console, no-restricted-syntax */
const PREFIX = 'ZC |';

export abstract class Logger {
  static log = (...args: any[]) => console.log(PREFIX, ...args);
  static info = (...args: any[]) => console.info(PREFIX, ...args);
  static warn = (...args: any[]) => console.warn(PREFIX, ...args);
  static error = (...args: any[]) => console.error(PREFIX, ...args);
  static debug = (...args: any[]) => console.debug(PREFIX, ...args);
}
