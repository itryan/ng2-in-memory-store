import { Headers, ResponseOptions } from '@angular/http';
import { STATUS_CODE_INFO, STATUS } from '../http-status-codes';

export class HttpUtil {
  static setStatusText(options: ResponseOptions) {
    try {
      const statusCode = STATUS_CODE_INFO[options.status];
      options['statusText'] = statusCode ? statusCode.text : 'Unknown Status';
      return options;
    } catch (err) {
      return new ResponseOptions({
        status: STATUS.INTERNAL_SERVER_ERROR,
        statusText: 'Invalid Server Operation'
      });
    }
  }

  static createErrorResponse(status: number, message: string) {
    return new ResponseOptions({
      body: { 'error': `${message}` },
      headers: new Headers({ 'Content-Type': 'application/json' }),
      status: status
    });
  }

  static b64EncodeUnicode(data: any) {
    return btoa(encodeURIComponent(JSON.stringify(data)).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(+('0x' + p1));
    }));
  }

  static isSuccess = (status: number): boolean => { return (status >= 200 && status < 300) };
}