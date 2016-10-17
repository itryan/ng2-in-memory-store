import { URLSearchParams } from '@angular/http';
import { InMemoryBackendConfigArgs } from '../models';
import { UrlParametersInfo } from '../url-parameters';

export class ListUtil {

  static genId(collection: any): any {
    // assumes numeric ids
    let maxId = 0;
    collection.reduce((prev: any, item: any) => {
      maxId = Math.max(maxId, typeof item.id === 'number' ? item.id : maxId);
    }, null);
    return maxId + 1;
  }

  static indexOf(collection: any[], id: number) {
    return collection.findIndex((item: any) => item.id === id);
  }

  static removeById(collection: any[], id: number) {
    const ix = ListUtil.indexOf(collection, id);
    if (ix > -1) {
      collection.splice(ix, 1);
      return true;
    }
    return false;
  }

  static findById(collection: any[], id: number | string) {
    return collection.find((item: any) => item.id === id);
  }

  static clone(data: any) {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Apply query/search parameters as a filter over the collection
   * This impl only supports RegExp queries on string properties of the collection
   * ANDs the conditions together
   */
  static applyQuery(collection: any[], filter: string, config: InMemoryBackendConfigArgs) {
    let query = new URLSearchParams(filter);

    // extract filtering conditions - {propertyName, RegExps) - from query/search parameters
    const conditions: { name: string, rx: RegExp }[] = [];
    const caseSensitive = config.caseSensitiveSearch ? undefined : 'i';
    query.paramsMap.forEach((value: string[], name: string) => {
      value.forEach(v => conditions.push({ name, rx: new RegExp(decodeURI(v), caseSensitive) }));
    });

    const len = conditions.length;
    if (!len) { return collection; }

    // AND the RegExp conditions
    return collection.filter(row => {
      let ok = true;
      let i = len;
      while (ok && i) {
        i -= 1;
        const cond = conditions[i];
        ok = cond.rx.test(row[cond.name]);
      }
      return ok;
    });
  }

  /**
   * Apply query/search parameters as a filter over the collection
   * This impl only supports RegExp queries on string properties of the collection
   * ANDs the conditions together
   */
  static applyPaging(collection: any[], params: UrlParametersInfo) {
    if (!params.skip && !params.limit)
      return collection;
    let length = collection.length;
    let start = params.skip < length ? params.skip : length;
    let end = start + params.limit;
    if (length < end)
      end = length;
    let list = collection.slice(start, end);
    return list;
  }

  // tries to parse id as number if collection item.id is a number.
  // returns the original param id otherwise.
  static parseId(collection: { id: any }[], id: string): any {
    if (!collection || !id) { return null; }
    const isNumberId = collection[0] && typeof collection[0].id === 'number';
    if (isNumberId) {
      const idNum = parseFloat(id);
      return isNaN(idNum) ? id : idNum;
    }
    return id;
  }

}