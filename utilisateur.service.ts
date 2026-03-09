import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
export interface Utilisateur {
    id: number;
    username: string;
    email: string;
    roles: string[];
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
}

export interface AssignRoleRequest {
    userId: number;
    role: string;
}
@Injectable({
    providedIn: 'root'
})
export class UtilisateurService {
    //Lien de l'API
    private api = `${environment.apiUrl}/api/utilisateurs`;

    constructor(private http: HttpClient){}

    getAll():Observable<Utilisateur[]>{
        return this.http.get<Utilisateur[]>(this.api);
    }
    
    create(data: CreateUserRequest):Observable<Utilisateur>{
        return this.http.post<Utilisateur>(this.api, data);
    }

    delete(id: number):Observable<void>{
        return this.http.delete<void>(`${this.api}/${id}`);
    }

    assignRole(req: AssignRoleRequest):Observable<Utilisateur>{
        const payload = {
            email: req.role,
            roleId: 0
        };
        return this.http.post<Utilisateur>(`${this.api}/role`, payload);
    }
    assignRoleByEmail(email: string, roleId: number):Observable<Utilisateur>{
        return this.http.post<Utilisateur>(`${this.api}/role`, {email, roleId});
    }
}