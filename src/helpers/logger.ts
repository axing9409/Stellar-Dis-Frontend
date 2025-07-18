/**
 * Logger utility for consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry;
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()}${contextStr}: ${message}`;
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context
    };

    const formattedMessage = this.formatMessage(entry);

    if (this.isDevelopment) {
      console.log(formattedMessage);
      if (data) {
        console.log('Data:', data);
      }
    }

    // In production, you might want to send logs to a service
    if (level === LogLevel.ERROR) {
      // Send error to monitoring service
      this.sendToMonitoringService(entry);
    }
  }

  private sendToMonitoringService(entry: LogEntry) {
    // Implementation for sending logs to monitoring service
    // This could be Sentry, LogRocket, or any other service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'error', {
        error_message: entry.message,
        error_context: entry.context,
        error_data: JSON.stringify(entry.data)
      });
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, error?: Error | any, context?: string) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    this.log(LogLevel.ERROR, message, errorData, context);
  }
}

export const logger = new Logger();
