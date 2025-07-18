import { createCustomElement } from '@angular/elements';
import {importProvidersFrom, Injector} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {App} from './app/app';
import 'zone.js';
import {HttpClientModule} from '@angular/common/http';
bootstrapApplication(App, {
  providers: [
    importProvidersFrom(HttpClientModule) // ✅ this makes _HttpClient injectable
  ]
}).then(appRef => {
  const injector = appRef.injector;
  const customElement = createCustomElement(App, { injector });
  customElements.define('chat-assist-widget', customElement);
});
