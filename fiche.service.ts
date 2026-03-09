import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
import { FichePoste, FicheSearchCriteria } from "../models/fiche.model";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class FicheService {
    //Lien de l'API
    private api = `${environment.apiUrl}/api/fiches`;

    constructor(private http: HttpClient){}

    getAllFiches():Observable<FichePoste[]>{
        return this.http.get<FichePoste[]>(this.api);
    }
    
    getFicheById(id: number):Observable<FichePoste>{
        return this.http.get<FichePoste>(`${this.api}/${id}`);
    }
    
    createFiche(data: Partial<FichePoste>):Observable<FichePoste>{
        return this.http.post<FichePoste>(this.api, data);
    }
    
    updateFiche(id:number, data: Partial<FichePoste>):Observable<FichePoste>{
        return this.http.put<FichePoste>(`${this.api}/${id}`, data);
    }

    validerFiche(id:number):Observable<FichePoste>{
        return this.http.put<FichePoste>(`${this.api}/${id}/validate`, {});
    }

    approuverFiche(id:number):Observable<FichePoste>{
        return this.http.put<FichePoste>(`${this.api}/${id}/approve`, {});
    }
    
    archiverFiche(id:number):Observable<FichePoste>{
        return this.http.put<FichePoste>(`${this.api}/${id}/archive`, {});
    }
    
    deleteFiche(id:number):Observable<void>{
        return this.http.delete<void>(`${this.api}/${id}`);
    }
    
    searchFiches(criteria: Partial<FicheSearchCriteria>):Observable<FichePoste[]>{
        return this.http.post<FichePoste[]>(`${this.api}/search`, criteria);
    }

    exportPdfSelected(ids: number[]): Observable<Blob> {
        return this.http.post(`${environment.apiUrl}/api/export/fiche/pdf/selected`, ids, {responseType: 'blob'});
    }
    
    exportPdfAll(): Observable<Blob> {
        return this.http.get(`${environment.apiUrl}/api/export/fiche/pdf/all`, {responseType: 'blob'});
    }
    
    exportExcel(): Observable<Blob> {
        return this.http.get(`${environment.apiUrl}/api/export/fiche/excel`, {responseType: 'blob'});
    }

    
}