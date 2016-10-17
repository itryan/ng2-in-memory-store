import { Inject, Injector, Optional } from '@angular/core';
import { BrowserXhr, Connection, ConnectionBackend,
         Headers, ReadyState, Request, RequestMethod,
         Response, ResponseOptions, URLSearchParams,
         XHRBackend, XSRFStrategy } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Observer }   from 'rxjs/Observer';
import 'rxjs/add/operator/delay';

import { STATUS, STATUS_CODE_INFO } from './http-status-codes';
import { HttpUtil, ListUtil } from './utils'
import { RequestInfo } from './models'
import { UnTypedInMemoryWebApi } from './in-memory-web-api'

import { InMemoryBackendConfigArgs, InMemoryBackendConfig, HttpMethodInterceptorArgs } from './models'

export class InMemoryBackend {
  protected passThruBackend: ConnectionBackend;
  protected config: InMemoryBackendConfigArgs = new InMemoryBackendConfig();

  constructor(
    private injector: Injector,
    private webApiService: UnTypedInMemoryWebApi,
    @Inject(InMemoryBackendConfig) @Optional() config: InMemoryBackendConfigArgs
    ) {

    const loc = this.getLocation('./');
    this.config.host = loc.host;
    this.config.rootPath = loc.pathname;
    Object.assign(this.config, config || {});

    this.setPassThruBackend();
  }


  createConnection(req: Request): Connection {
    const response = this.handleRequest(req);
    return {
      readyState: ReadyState.Done,
      request: req,
      response
    };
  }

  ////  protected /////

  protected handleRequest(req: Request): Observable<Response> {
    const {base, collectionName, id, resourceUrl, query} = this.parseUrl(req.url);
    const reqInfo: RequestInfo = {
      req: req,
      base: base,
      collectionName: collectionName,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      id: id,
      query: query,
      resourceUrl: resourceUrl
    };

    const reqMethodName = RequestMethod[req.method || 0].toLowerCase();
    const interceptorArgs: HttpMethodInterceptorArgs = {
      requestInfo: reqInfo,
      config: this.config,
      passThruBackend: this.passThruBackend
    };

    let resOptions:ResponseOptions;
    try {
      resOptions  = this.webApiService.tryHandleRequest(reqInfo);

      if (resOptions){
        return this.createObservableResponse(resOptions);
      } else if (this.passThruBackend) {
        return this.passThruBackend.createConnection(req).response;

      } else {
        resOptions = this.createErrorResponse(STATUS.NOT_FOUND, `Collection '${collectionName}' not found`);
        return this.createObservableResponse(resOptions);
      }

    } catch (error) {
      const err = error.message || error;
      resOptions = this.createErrorResponse(STATUS.INTERNAL_SERVER_ERROR, `${err}`);
      return this.createObservableResponse(resOptions);
    }

  }

  protected getLocation(href: string) {
    const l = document.createElement('a');
    l.href = href;
    return l;
  };

  protected parseUrl(url: string) {
    try {
      const loc = this.getLocation(url);
      let drop = this.config.rootPath.length;
      let urlRoot = '';
      if (loc.host !== this.config.host) {
        drop = 1;
        urlRoot = loc.protocol + '//' + loc.host + '/';
      }
      const path = loc.pathname.substring(drop);
      let [base, collectionName, id] = path.split('/');
      const resourceUrl = urlRoot + base + '/' + collectionName + '/';
      [collectionName] = collectionName.split('.'); // ignore anything after the '.', e.g., '.json'
      const query = loc.search && new URLSearchParams(loc.search.substr(1));
      return { base, id, collectionName, resourceUrl, query };
    } catch (err) {
      const msg = `unable to parse url '${url}'; original error: ${err.message}`;
      throw new Error(msg);
    }
  }

  protected createErrorResponse(status: number, message: string)  {
    return new ResponseOptions({
      body: { 'error': `${message}` },
      headers: new Headers({ 'Content-Type': 'application/json' }),
      status: status
    });
  }

  protected createObservableResponse(resOptions: ResponseOptions): Observable<Response> {
      resOptions = this.setStatusText(resOptions);
      if (this.config.defaultResponseOptions) {
        resOptions = this.config.defaultResponseOptions.merge(resOptions);
      }

      const res = new Response(resOptions);

      return new Observable<Response>((responseObserver: Observer<Response>) => {
        if (HttpUtil.isSuccess(res.status)) {
          responseObserver.next(res);
          responseObserver.complete();
        } else {
          responseObserver.error(res);
        }
        return () => { }; 
      })
      .delay(this.config.delay || 500);
  }

  protected setPassThruBackend() {
    this.passThruBackend = undefined;
    if (this.config.passThruUnknownUrl) {
      try {
        const browserXhr = this.injector.get(BrowserXhr);
        const baseResponseOptions = this.injector.get(ResponseOptions);
        const xsrfStrategy = this.injector.get(XSRFStrategy);
        this.passThruBackend = new XHRBackend(browserXhr, baseResponseOptions, xsrfStrategy);
      } catch (ex) {
        ex.message = 'Cannot create passThru404 backend; ' + (ex.message || '');
        throw ex;
      }
    }
  }

  protected setStatusText(options: ResponseOptions) {
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
}
