import { createCustomElement } from '@angular/elements';
import { Injector } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {App} from './app/app';

bootstrapApplication(App).then(appRef => {
  const injector = appRef.injector;
  const customElement = createCustomElement(App, { injector });
  customElements.define('chat-assist-widget', customElement);
});
