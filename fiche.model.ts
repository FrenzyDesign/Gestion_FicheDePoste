export type StatusFiche = 'Brouillon' | 'En validation' | 'Validée' | 'Archivée';

export type RoleApp = 'RH' | 'MANAGER' | 'DCH' | 'AGENT' | 'AUDIT' | 'ADMIN';

export const ROLE_LABELS: Record<RoleApp, string> = {
    'RH': 'Responsable RH',
    'MANAGER': 'Manager',
    'DCH': 'Direction CH',
    'AGENT': 'Agent',
    'AUDIT': 'Audit',
    'ADMIN': 'Administrateur',
};

export type Permission =
    | 'CREATE_FICHE'
    | 'EDIT_FICHE'
    | 'ARCHIVE_FICHE'
    | 'VALIDATE_FICHE'
    | 'APPROVE_FICHE'
    | 'VIEW_FICHE'
    | 'SEARCH_FICHE'
    | 'EXPORT_PDF'
    | 'EXPORT_EXCEL'
    | 'READ_ONLY'
    | 'VIEW_HISTORY'
    | 'MANAGE_USERS'
    | 'ASSIGN_ROLE';

export const PERMISSIONS_BY_ROLE: Record<RoleApp, Permission[]> = {
    'RH': [
        'CREATE_FICHE',
        'EDIT_FICHE',
        'ARCHIVE_FICHE',
        'VIEW_FICHE',
        'SEARCH_FICHE',
        'EXPORT_PDF',
        'EXPORT_EXCEL',
    ],
    'MANAGER': [
        'VALIDATE_FICHE',
        'VIEW_FICHE',
        'SEARCH_FICHE',
        'EXPORT_PDF',
    ],
    'DCH': [
        'APPROVE_FICHE',
        'VIEW_FICHE',
        'SEARCH_FICHE',
        'EXPORT_PDF',
    ],
    'AGENT': [
        'SEARCH_FICHE',
        'READ_ONLY',
    ],
    'AUDIT': [  
        'READ_ONLY',
        'VIEW_HISTORY',
        'SEARCH_FICHE',
    ],
    'ADMIN': [
        'MANAGE_USERS',
        'ASSIGN_ROLE',
    ],
}

export interface FichePoste {
    fiche_id: number;
    intitule_poste: string;
    direction: string;
    departement: string;
    service: string;
    rattachement_hierarchique: string;
    mission_principale: string;
    activites_detaillees: string;
    responsabilites: string;
    competences_techniques: string;
    competences_comportementales: string;
    niveau_etudes: string;
    experience_minimale: string;
    certifications: string;
    kpis: string;
    risques: string;
    statut: StatusFiche;
    version: number;
    created_at: string;
    updated_at: string;
    createurNom?: string;
    validateurNom?: string;
    approbateurNom?: string;
}

export interface AuditEntry {
    audit_id: number;
    action: string;
    date_action: string;
    details: string;
    userNom: string;
    userRole: string;
    ficheId?: number;
    ficheVersion?: number;
}

export interface FicheSearchCriteria{
    intitulePoste?: string;
    direction?: string;
    departement?: string;
    statut?: string;
    competencesTechniques?: string;
    competencesComportementales?: string;
}

