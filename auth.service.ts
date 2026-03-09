import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { Permission, ROLE_LABELS, RoleApp } from "../models/fiche.model";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    id: number;
    username: string;
    email: string;
    roles: string[];
    token: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    //Url de base de Spring Boot
    private apiUrl = `${environment.apiUrl}/api/utilisateurs`

    //Clés de stockage
    private readonly TOKEN_KEY = 'bhs_token';
    private readonly USER_KEY = 'bhs_user';

    constructor(private http: HttpClient) {}

    //Authentification
    login(email: string, password: string): Observable<AuthResponse> {
        const payload: LoginRequest = {email, password};
        return this.http.post<AuthResponse>(`${this.apiUrl}/authenticate`, payload);
    }

    //Gestion de session
        //Stocke le token et les infos utilisateur
        //Si remember = true → localStorage (persiste à la fermeture de l'onglet) Sinon sessionStorage
    storeSession(response: AuthResponse, remember: boolean): void {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(this.TOKEN_KEY, response.token);
        storage.setItem(this.USER_KEY, JSON.stringify(response));
    }
        //Récupère le token JWT
    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY)
            || sessionStorage.getItem(this.TOKEN_KEY);
    }
        //Récupère l'utilisateur courant
    getCurrentUser(): AuthResponse | null {
        const raw = localStorage.getItem(this.USER_KEY)
                || sessionStorage.getItem(this.USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as AuthResponse;
        } catch {
            return null;
        }
    }
    //Vérifie si le token est valide
    isLoggedIn(): boolean {
        const token = this.getToken();
        if(!token) return false;
        //Décode basique du payload JWT
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            //exp en secondes Unix
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }
    //Déconnexion : efface les deux storages
    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.USER_KEY);
    }
    getPermissionsFromToken(): Permission[] {
        const token = this.getToken();
        if (!token) return [];
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            //Spring Boot encode les authorities
            const raw: any[] = 
                payload['authorities'] ||
                payload['permissions'] ||
                payload['roles'] ||
                [];
            //Les authorities peuvent être des strings ou des objets
            return raw.map((a: any) =>
                typeof a === 'string' ? a: a.authority
        ) as Permission[];
        } catch { return [];}
    }

    //Vérifie si l'utilisateur possède une permission donnée
    hasPermission(permission: Permission): boolean {
        return this.getPermissionsFromToken().includes(permission);
    }

    //Retourne le libellé lisible d'un rôle backend
    getRoleLabel(role: string):string {
        return ROLE_LABELS[role as RoleApp] ?? role;
    }
}