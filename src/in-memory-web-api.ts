import { RequestMethod, ResponseOptions } from '@angular/http';
import 'rxjs/add/operator/delay';

import { STATUS } from './http-status-codes';
import { RequestInfo, InMemoryWebApiConfig } from './models';
import { HttpUtil, ListUtil } from './utils';
import { UnTypedInMemoryDbService, InMemoryDbService } from './in-memory-db.service';
import { UrlParametersParserConfig, UrlParametersParser } from './url-parameters';
import _ from 'lodash'

export abstract class UnTypedInMemoryWebApi {

  protected paramsParser: UrlParametersParser = null;
  protected _db: any;

  constructor(
    protected dbService: UnTypedInMemoryDbService,
    protected config: InMemoryWebApiConfig
  ) {
    this.resetDb();
    this.paramsParser = new UrlParametersParser(config);
  }

  private get untypedDb(): any {
    return this._db;
  }

  /**
   * Reset the "database" to its original state
   */
  protected resetDb() {
    this._db = this.dbService.createDb();
  }

  tryHandleRequest(reqInfo: RequestInfo) {
    this.beforeHandleRequest(reqInfo);

    let resOptions: ResponseOptions = null;
    if ('commands' === reqInfo.base.toLowerCase()) {
      resOptions = this.commands(reqInfo);
    }
    if (!resOptions) {
      resOptions = this.tryHandleEndpoint(reqInfo);
    }
    if (!resOptions) {
      resOptions = this.tryHandleCollection(reqInfo);
    }

    return resOptions;
  }

  protected beforeHandleRequest(reqInfo: RequestInfo) {
    if (this.config.useJwt){
      this.handleJwt(reqInfo);
    }
  }

  protected handleJwt(reqInfo: RequestInfo){
    let req = reqInfo.req;
    let bearer = req.headers.get('Authorization');
    if (bearer && bearer.indexOf('Bearer ') > -1) {
      var token = bearer.substr(bearer.indexOf('Bearer '));
      var arr = token.split('.');
      var content = atob(arr[1]);
      let payload = JSON.parse(content);
      if (payload.uid) {
        reqInfo.uid = +payload.uid;
      }
    }
  }

  protected commands(reqInfo: RequestInfo): ResponseOptions {
    const command = reqInfo.collectionName.toLowerCase();
    const method = reqInfo.req.method;
    let resOptions: ResponseOptions;

    switch (command) {
      case 'resetdb':
        this.resetDb();
        resOptions = new ResponseOptions({ status: STATUS.OK });
        break;
      case 'config':
        if (method === RequestMethod.Get) {
          resOptions = new ResponseOptions({
            body: ListUtil.clone(this.config),
            status: STATUS.OK
          });
        } else {
          const body = JSON.parse(<string>reqInfo.req.text() || '{}');
          Object.assign(this.config, body);
          resOptions = new ResponseOptions({ status: STATUS.NO_CONTENT });
        }
        break;
      default:
        resOptions = HttpUtil.createErrorResponse(
          STATUS.INTERNAL_SERVER_ERROR, `Unknown command "${command}"`);
    }
    return resOptions;
  }

  protected tryHandleEndpoint(reqInfo: RequestInfo): ResponseOptions {
    return null;
  }

  protected tryHandleCollection(reqInfo: RequestInfo): ResponseOptions {
    let collection: any[] = this.untypedDb[reqInfo.collectionName];

    if (!collection) {
      return null;
    }

    const req = reqInfo.req;
    let resOptions: ResponseOptions;

    switch (req.method) {
      case RequestMethod.Get:
        resOptions = this.tryCollectionGet(reqInfo, collection);
        break;
      case RequestMethod.Post:
        resOptions = this.tryCollectoniPost(reqInfo, collection);
        break;
      case RequestMethod.Put:
        resOptions = this.tryCollectionPut(reqInfo, collection);
        break;
      case RequestMethod.Delete:
        resOptions = this.tryCollectionDelete(reqInfo, collection);
        break;
      default:
        resOptions = HttpUtil.createErrorResponse(STATUS.METHOD_NOT_ALLOWED, 'Method not allowed');
        break;
    }
    return resOptions;
  }

  protected tryCollectionGet(reqInfo: RequestInfo, collection: any[]) {
    let data = collection;
    let id = reqInfo.id;
    let query = reqInfo.query;
    let collectionName = reqInfo.collectionName;
    let headers = reqInfo.headers;

    if (id) {
      data = ListUtil.findById(data, id);
    } else if (query && this.paramsParser) {
      let params = this.paramsParser.parse(query);
      if (params.filter) {
        data = ListUtil.applyQuery(data, params.filter, this.config);
      }
      if (data) {
        data = ListUtil.applyPaging(data, params)
      }
    }

    if (!data) {
      return HttpUtil.createErrorResponse(STATUS.NOT_FOUND,
        `'${collectionName}' with id='${id}' not found`);
    }
    return new ResponseOptions({
      body: { data: ListUtil.clone(data) },
      headers: headers,
      status: STATUS.OK
    });

  }

  protected tryCollectoniPost({/* collectionName, */ headers, id, req, resourceUrl}: RequestInfo, collection: any[]) {
    const item = JSON.parse(<string>req.text());
    if (!item.id) {
      item.id = id || ListUtil.genId(collection);
    }
    // ignore the request id, if any. Alternatively,
    // could reject request if id differs from item.id
    id = item.id;
    const existingIx = ListUtil.indexOf(collection, id);
    if (existingIx > -1) {
      collection[existingIx] = item;
      return new ResponseOptions({
        headers: headers,
        status: STATUS.NO_CONTENT
      });
    } else {
      collection.push(item);
      headers.set('Location', resourceUrl + '/' + id);
      return new ResponseOptions({
        headers: headers,
        body: { data: ListUtil.clone(item) },
        status: STATUS.CREATED
      });
    }
  }

  protected tryCollectionPut({id, collectionName, headers, req}: RequestInfo, collection: any[]) {

    const data = JSON.parse(<string>req.text());
    let ids: number[] = data ? data.ids : [];
    let props = data ? data.props : {};

    if (!collection || !ids || !props) {
      return new ResponseOptions({ body: { data: {} }, headers: headers, status: STATUS.OK })
    }

    let col = collection;
    let items = _.filter(col, (item) => ids.indexOf(item['id']) > -1);

    for (var i in items) {
      for (var p in props) {
        items[i][p] = props[p];
      }
    }

    return new ResponseOptions({
      body: { data: ListUtil.clone(items) },
      headers: headers,
      status: STATUS.OK
    });
  }

  protected tryCollectionDelete({id, collectionName, headers /*, req */}: RequestInfo, collection: any[]) {
    if (!id) {
      return HttpUtil.createErrorResponse(STATUS.NOT_FOUND, `Missing "${collectionName}" id`);
    }
    const exists = ListUtil.removeById(collection, id);
    return new ResponseOptions({
      headers: headers,
      status: (exists || !this.config.delete404) ? STATUS.NO_CONTENT : STATUS.NOT_FOUND
    });
  }

}

export abstract class InMemoryWebApi<T> extends UnTypedInMemoryWebApi {

  protected get db(): T {
    return this._db;
  }

  constructor(
    protected dbService: InMemoryDbService<T>,
    protected config: InMemoryWebApiConfig
  ) {
    super(dbService, config);
  }

  protected tryHandleEndpoint(reqInfo: RequestInfo): ResponseOptions {
    let resp: ResponseOptions;
    switch (reqInfo.collectionName) {
      case "login":
        resp = this.handleAuth(reqInfo);
        break;
      //case "logout":
        // resp = this.handleAuth(reqInfo);
        // break;
    }

    return resp;
  }

  // auth

  private auth: any = null;

  private handleAuth(reqInfo: RequestInfo): ResponseOptions {
    const req = reqInfo.req;
    let rspn: ResponseOptions;

    const getRspn = () => {
      return new ResponseOptions({
        body: { data: ListUtil.clone(this.auth) },
        headers: reqInfo.headers,
        status: STATUS.OK
      })
    }

    const getTokenRspn = () => {
      var time = new Date();
      time.setMinutes(time.getMinutes() + 30);
      let payload = {
        uid: this.auth.id,
        uname: this.auth.name,
        exp: Math.floor(time.getTime() / 1000)
      }
      let token = [HttpUtil.b64EncodeUnicode({ test: 'test' }), HttpUtil.b64EncodeUnicode(payload), HttpUtil.b64EncodeUnicode({ test: 'test' })].join('.');
      return new ResponseOptions({
        body: { token: token, uid: this.auth.id, uname: this.auth.name },
        headers: reqInfo.headers,
        status: STATUS.OK
      })
    }

    switch (req.method) {
      case RequestMethod.Get:
        rspn = getRspn();
        break;
      case RequestMethod.Post:
        let data = req.json();
        this.auth = { id: data.uid, name: data.uname, }
        rspn = getTokenRspn();
        break;
    }
    return rspn;
  }
}

