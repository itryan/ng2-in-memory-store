import { BaseResponseOptions, BrowserXhr, Connection, ConnectionBackend,
         Headers, ReadyState, Request, RequestMethod,
         Response, ResponseOptions, URLSearchParams,
         XHRBackend, XSRFStrategy } from '@angular/http';

/**
* Interface for object w/ info about the current request url
* extracted from an Http Request
*/
export interface RequestInfo {
  req: Request;
  base: string;
  uid?: number;
  collectionName: string;
  headers: Headers;
  id: any;
  query: URLSearchParams;
  resourceUrl: string;
}

/**
* Interface for InMemoryBackend configuration options
*/
export interface InMemoryBackendConfigArgs {
  /**
   * false (default) if search match should be case insensitive
   */
  caseSensitiveSearch?: boolean;
  /**
   * default response options
   */
  defaultResponseOptions?: ResponseOptions;
  /**
   * delay (in ms) to simulate latency
   */
  delay?: number;
  /**
   * false (default) if ok when object-to-delete not found; else 404
   */
  delete404?: boolean;
  /**
   * false (default) if should pass unrecognized request URL through to original backend; else 404
   */
  passThruUnknownUrl?: boolean;
  /**
   * host for this service
   */
  host?: string;
  /**
   * root path before any API call
   */
  rootPath?: string;
}

/**
*  InMemoryBackendService configuration options
*  Usage:
*    InMemoryWebApiModule.forRoot(InMemHeroService, {delay: 600})
*
*  or if providing separately:
*    provide(InMemoryBackendConfig, {useValue: {delay: 600}}),
*/
export class InMemoryBackendConfig implements InMemoryBackendConfigArgs {
  constructor(config: InMemoryBackendConfigArgs = {}) {
    Object.assign(this, {
      // default config:
      caseSensitiveSearch: false,
      defaultResponseOptions: new BaseResponseOptions(),
      delay: 500,
      delete404: false,
      passThruUnknownUrl: false,
      host: '',
      rootPath: ''
    }, config);
  }
}

/**
* Interface for object passed to an HTTP method override method
*/
export interface HttpMethodInterceptorArgs {
  requestInfo: RequestInfo;           // parsed request
  config: InMemoryBackendConfigArgs;  // the current config
  passThruBackend: ConnectionBackend; // pass through backend, if it exists
}


/**
* Interface for InMemoryBackend configuration options
*/
export interface InMemoryWebApiConfig {
  /**
   * false (default) if search match should be case insensitive
   */
  caseSensitiveSearch?: boolean;
  /**
   * default response options
   */
  defaultResponseOptions?: ResponseOptions;
  /**
   * delay (in ms) to simulate latency
   */
  delay?: number;
  /**
   * false (default) if ok when object-to-delete not found; else 404
   */
  delete404?: boolean;
  /**
   * host for this service
   */
  host?: string;
  /**
   * root path before any API call
   */
  rootPath?: string;

  skip: string;

  limit: string;

  filter: string;

  useJwt?: boolean;
}