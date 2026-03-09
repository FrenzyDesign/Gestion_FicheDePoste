import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { Router } from "@angular/router";
import { catchError, Observable, throwError } from "rxjs";

export const jwtInterceptorFn: HttpInterceptorFn = (
    request: HttpRequest<unknown>, 
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>>  => {

        const authSvc = inject(AuthService);
        const router =  inject(Router);
         
        //Récupère le token JWT stocké
        const token = authSvc.getToken();

        //Cloner la requête et ajouter l'en-tête Authorization si un token existe
        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
        
        return next(request).pipe(
            catchError((error: HttpErrorResponse) => {
                //Si 401 → déconnecter et retourner à login
                if (error.status === 401) {
                    authSvc.logout();
                    router.navigate(['/login']);
                }
                return throwError(() => error);
            })
        );
    }
