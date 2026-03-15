type LoggerMeta = Record<string, unknown>;

class Logger {
  info(message: string, meta?: LoggerMeta) {
    console.log(message, meta ?? {});
  }

  warn(message: string, meta?: LoggerMeta) {
    console.warn(message, meta ?? {});
  }

  error(message: string, meta?: LoggerMeta) {
    console.error(message, meta ?? {});
  }
}

export const logger = new Logger();
