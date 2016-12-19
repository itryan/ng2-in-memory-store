import { Injector, NgModule, ModuleWithProviders } from '@angular/core';
import { XHRBackend } from '@angular/http';
import { InMemoryBackendConfigArgs, InMemoryBackendConfig } from './models';

import { UnTypedInMemoryWebApi, InMemoryWebApi } from './in-memory-web-api';
import { InMemoryBackend } from './in-memory-backend';

export function inMemoryBackendServiceFactory(injector: Injector, apiService: UnTypedInMemoryWebApi, options: InMemoryBackendConfig): XHRBackend {
  let backend: any = new InMemoryBackend(injector, apiService, options);
  return (<XHRBackend>backend);
}

export const DefaultBankendConfig: InMemoryBackendConfig = new InMemoryBackendConfig();

@NgModule({
  providers: [{
    provide: XHRBackend,
    useFactory: inMemoryBackendServiceFactory,
    deps: [Injector, InMemoryWebApi, InMemoryBackendConfig]
  }]
})
export class InMemoryStoreModule {
  static forRoot(webApi: UnTypedInMemoryWebApi, options: InMemoryBackendConfigArgs = DefaultBankendConfig): ModuleWithProviders {
    return {
      ngModule: InMemoryStoreModule,
      providers: [
        { provide: InMemoryWebApi, useValue: webApi },
        { provide: InMemoryBackendConfig, useValue: options },
      ]
    };
  }
}
