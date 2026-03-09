import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { AuditEntry } from "../models/fiche.model";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AuditService {
    //Lien de l'API
    private api = `${environment.apiUrl}/api/audit`;

    constructor(private http: HttpClient){}

    getAllLogs():Observable<AuditEntry[]>{
        return this.http.get<AuditEntry[]>(this.api);
    }
    
    getLogsByFiche(ficheId: number):Observable<AuditEntry[]>{
        return this.http.get<AuditEntry[]>(`${this.api}/fiche/${ficheId}`);
    }
    
    getLogsByUser(userId: number):Observable<AuditEntry[]>{
        return this.http.get<AuditEntry[]>(`${this.api}/utilisateur/${userId}`);
    }
    
    getLogsByAction(action: string):Observable<AuditEntry[]>{
        return this.http.get<AuditEntry[]>(`${this.api}/action/${action}`);
    }
    
    getLogsByDateRange(startDate: string, endDate: string):Observable<AuditEntry[]>{
        return this.http.get<AuditEntry[]>(`${this.api}/period`, { params: {startDate, endDate}});
    }
    
}