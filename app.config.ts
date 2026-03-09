import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from "@angular/router";
import { jwtInterceptorFn } from './interceptors/jwt.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
      provideRouter(routes),

      provideHttpClient(withInterceptors([jwtInterceptorFn])),

  ]
};
