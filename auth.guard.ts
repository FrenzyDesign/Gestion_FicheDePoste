import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(
        private authSvc: AuthService,
        private router : Router
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot, 
        state: RouterStateSnapshot) 
        : boolean{
            
            //Si un token valide existe alors autoriser
            if (this.authSvc.isLoggedIn()) {
                return true
            }
            //Sinon rediriger vers login
            this.router.navigate(['/login']);
            return false;
    }
}