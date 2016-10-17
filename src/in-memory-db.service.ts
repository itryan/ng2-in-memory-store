export abstract class UnTypedInMemoryDbService {
  abstract createDb(): any;
}

export abstract class InMemoryDbService<T> extends UnTypedInMemoryDbService {
  abstract createDb(): T;
}

