import { CommonModule, NgClass } from "@angular/common";
import { Component, HostListener, OnInit, ViewEncapsulation } from "@angular/core";
import { AuditEntry, FichePoste, Permission, PERMISSIONS_BY_ROLE, ROLE_LABELS, RoleApp } from "../../models/fiche.model";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthResponse, AuthService } from "../../services/auth.service";
import { FicheService } from "../../services/fiche.service";
import { AuditService } from "../../services/audit.service";
import { Utilisateur, UtilisateurService } from "../../services/utilisateur.service";
import { Router } from "@angular/router";

//Interfaces locales
interface MenuItem {
    id: string;
    label: string;
    icon: string;
    permission: Permission;
    bottom?: boolean;
}

interface ConfirmationConfig {
    visible: boolean;
    titre: string;
    message: string;
    details: string;
    labelOk: string;
    type: 'danger' | 'warning' | 'success';
    action: () => void;
}       

const CONFIRMATION_VIDE: ConfirmationConfig = {
    visible: false,
    titre: '',
    message: '',
    details: '',
    labelOk: 'Confirmer',
    type: 'danger',
    action: () => {}
};


//Les items de menu possibles
const ALL_MENU_ITEMS: MenuItem[] = [
    {id: 'creer', label: 'Créer une fiche', icon: 'pencil', permission: 'CREATE_FICHE'},
    {id: 'modifier', label: 'Modifier une fiche', icon: 'modify', permission: 'EDIT_FICHE'},
    {id: 'archiver', label: 'Archiver', icon: 'file-storage', permission: 'ARCHIVE_FICHE'},
    {id: 'valider', label: 'Valider', icon: 'validation', permission: 'VALIDATE_FICHE'},
    {id: 'approuver', label: 'Approuver', icon: 'approve', permission: 'APPROVE_FICHE'},
    {id: 'historique', label: 'Historique', icon: 'historical', permission: 'VIEW_HISTORY'},
    {id: 'consulter', label: 'Consulter', icon: 'view', permission: 'VIEW_HISTORY'},
    {id: 'version', label: 'Version', icon: 'version', permission: 'VIEW_HISTORY'},
    {id: 'rechercher', label: 'Rechercher', icon: 'search', permission: 'SEARCH_FICHE'},
    {id: 'exporter', label: 'Exporter', icon: 'export-file', permission: 'EXPORT_PDF'},
    {id: 'creer-user', label: 'Créer utilisateur', icon: 'add-user', permission: 'MANAGE_USERS'},
    {id: 'supprimer', label: 'Supprimer', icon: 'delete-user', permission: 'MANAGE_USERS'},
    {id: 'assigner', label: 'Assigner un rôle', icon: 'assigner', permission: 'ASSIGN_ROLE'},
    {id: 'selectionner', label: 'Sélectionner', icon: 'check', permission: 'VIEW_FICHE', bottom: true},
];

//Nombre de fiches par page
const PAGE_SIZE = 9;

@Component({
    selector: 'app-dashboard',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['dashboard.component.css']
})
export class DashboardComponent implements OnInit{
    //Utilisateur et Rôle
    currentUser!: AuthResponse;
    activeRole!: RoleApp;
    activeRolePermissions: Permission[] = [];
    allTokenPermissions: Permission[] = [];
    menuItemsTop: MenuItem[] = [];
    menuItemsBottom: MenuItem | null = null;
    activeMenu: string = '';
    showRoleDropdown = false;
    
    //Thème
    sidebarCollapsed = false;
    isDark = false;
    helpVisible = false;
    exportMode = 'pdf-selected';
    
    //Fiches
    fiches: FichePoste[] = [];
    fichesFiltrees: FichePoste[] = [];   //Liste après filtre de rôle / recherche
    fichesDuPage: FichePoste[] = [];    //Tranche affichée = fichesFiltrees[page]
    selectedFiches: Set<number> = new Set();
    isSelectionMode = false;
    ficheDetail: FichePoste | null = null;
    isLoading = false;
    isLoadingFiches = false;
    isLoadingUsers = false;
    isLoadingAudit = false;
    erreurChargement = '';
    
    //Pagination
    pageCourante = 1;
    get totalPages(): number { return Math.ceil(this.fichesFiltrees.length / PAGE_SIZE) || 1;}
    get pages(): number[] { return Array.from({length: this.totalPages}, (_, i) => i+1);}
    
    //Audit
    auditLogs: AuditEntry[] = [];
    versionLogs: AuditEntry[] = [];
    selectedFicheVersion: FichePoste | null = null;
    auditSearchForm!: FormGroup;
    filtreHistoriqueFicheId: number | null = null;
    //Actions d'audit du backend (enum AuditAction)
    auditActions = [
        'CREATE_FICHE', 'EDIT_FICHE', 'VALIDATE_FICHE', 'APPROVE_FICHE',
        'ARCHIVE_FICHE', 'EXPORT_PDF', 'EXPORT_EXCEL',
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCESS_DENIED'
    ];
    readonly ACTION_LABELS: Record<string, string> = {
        'CREATE_FICHE': 'Création d\'une fiche', 
        'EDIT_FICHE': 'Modification d\'une fiche', 
        'VALIDATE_FICHE': 'Validation d\'une fiche', 
        'APPROVE_FICHE': 'Approbation d\'une fiche',
        'ARCHIVE_FICHE': 'Archivage d\'une fiche', 
        'EXPORT_PDF': 'Export PDF', 
        'EXPORT_EXCEL': 'Export Excel',
        'LOGIN_SUCCESS': 'Connexion réussie', 
        'LOGIN_FAILED': 'Tentative de connexion échoué', 
        'ACCESS_DENIED': 'Accès refusé',
    }
    
    //Formulaires
    ficheForm!: FormGroup;
    ficheToEdit: FichePoste | null = null;
    searchForm!: FormGroup;
    userForm!: FormGroup;
    formSoumis = false; //Déclenche l'affichage des erreurs de validation

    //Données
    statutOptions = ['Brouillon', 'En validation', 'Validée', 'Archivée'];
    intitulesUniques: string[] = [];
    techniquesUniques: string[] = [];
    comportementalesUniques: string[] = [];
    directionsUniques: string[] = [];
    deptUniques: string[] = [];
    utilisateurs: Utilisateur[] = [];
    selectedUserId: number | null = null;
    rolesDisponibles: RoleApp[] = ['RH', 'MANAGER', 'DCH', 'AGENT', 'AUDIT', 'ADMIN'];
    selectedNewRole: RoleApp | null = null;
    assignStep = 1;

    //Alertes
    alertMsg = '';
    alertType: 'success' | 'error' = 'success';

    //Confirmation
    confirmation: ConfirmationConfig = {...CONFIRMATION_VIDE};

    constructor(
        private authSvc: AuthService, 
        private ficheSvc: FicheService, 
        private auditSvc: AuditService, 
        private userSvc: UtilisateurService,
        private fb: FormBuilder,
        private router: Router 
    ) {}

    ngOnInit(): void {
        const user = this.authSvc.getCurrentUser();
        if (!user) {this.router.navigate(['/login']); return;}
        this.currentUser = user;
        this.allTokenPermissions = this.authSvc.getPermissionsFromToken();    
        if(this.allTokenPermissions.length === 0){
            const role = (user.roles?.[0] ?? 'AGENT') as RoleApp;
            this.allTokenPermissions = [...(PERMISSIONS_BY_ROLE[role] ?? [])];
        }
        this.activeRole = (user.roles?.[0] ?? 'AGENT') as RoleApp;
        this.initForms();
        this.applyRoleSwitch(this.activeRole);
        if (this.activeRole !== 'ADMIN' && this.activeRole !== 'AUDIT') {
            this.loadFiches();
        }
    }

    //Switch de rôle
    applyRoleSwitch(role: RoleApp): void{
        this.activeRole = role;
        const permsDuRole = PERMISSIONS_BY_ROLE[role] ?? [];
        this.activeRolePermissions = [...permsDuRole];
        
        const all = ALL_MENU_ITEMS.filter(i => this.activeRolePermissions.includes(i.permission));
        this.menuItemsTop = all.filter(i => !i.bottom);
        this.menuItemsBottom = all.find(i => i.bottom) ?? null;

        this.isSelectionMode = false;
        this.selectedFiches = new Set();
        this.ficheToEdit = null;
        this.ficheDetail = null;

        //Vue initiale selon le rôle
        if (role === 'AUDIT') {
            this.activeMenu = '';
            this.loadAuditLogs();
        }
        else if (role === 'ADMIN') {
            this.activeMenu = '';
            this.loadUtilisateurs();
        } else {
            this.activeMenu = '';
        }
    }
    switchRole(role: RoleApp): void{
        this.showRoleDropdown = false;
        this.applyRoleSwitch(role);
        if (role !== 'ADMIN' && role !== 'AUDIT') this.loadFiches();
    }
    castRole(role: string): RoleApp {return role as RoleApp;}
    can(permission: Permission): boolean {
        return this.activeRolePermissions.includes(permission);
    }

    //Navigation Menu
    onMenuClick(menuId: string): void {
        if (menuId === 'home') {
            this.activeMenu = '';
            this.isSelectionMode = false;
            this.selectedFiches = new Set();
            this.ficheToEdit = null;
            this.ficheForm.reset();
            this.formSoumis = false;
            if (this.activeRole === 'ADMIN') {
                this.loadUtilisateurs();
            } else if (this.activeRole === 'AUDIT') {
                this.loadAuditLogs()
            } else {
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
            }
            return;
        }
        if (menuId === 'selectionner') {
            this.isSelectionMode = !this.isSelectionMode;
            this.activeMenu = !this.isSelectionMode ? 'selectionner' : '';
            if (!this.isSelectionMode) {
                this.selectedFiches = new Set();
            } else {
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
            }
            return;
        }

        //Réinitialisation générale
        this.activeMenu = menuId;
        this.isSelectionMode = false;
        this.selectedFiches = new Set();
        this.ficheToEdit = null;
        this.formSoumis = false;

        switch (menuId) {
            case 'creer':
                this.ficheToEdit = null;
                this.ficheForm.reset();
                break;
            case 'modifier':
                this.ficheToEdit = null;
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
                break;
            case 'archiver':
                this.isSelectionMode = true;
                this.appliquerFilterEtPaginer(
                    this.fiches.filter(f => f.statut === 'Brouillon' || f.statut === 'Validée')
                );
                break;
            case 'valider':
                this.isSelectionMode = true;
                this.appliquerFilterEtPaginer(this.fiches.filter(f => f.statut === 'Brouillon'));
                break;
            case 'approuver':
                this.isSelectionMode = true;
                this.appliquerFilterEtPaginer(this.fiches.filter(f => f.statut === 'En validation'));
                break;
            case 'rechercher':
                this.searchForm.reset();
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
                break;
            case 'exporter':
                this.exportMode = 'pdf-selected';
                this.isSelectionMode = true;
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
                break;
            case 'historique':
            case 'consulter':
                this.loadAuditLogs();
                break;
            case 'version':
                this.selectedFicheVersion = null;
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
                break;
            case 'creer-user':
            case 'supprimer':
            case 'assigner':
                this.assignStep = 1;
                this.selectedUserId = null;
                this.selectedNewRole = null;
                this.userForm.reset();
                this.loadUtilisateurs();
                break;
            default:
                this.appliquerFilterEtPaginer(this.getDefaultFiches());
        }
    }
    //Chargement des données
    loadFiches(): void {
        this.isLoadingFiches = true;
        this.erreurChargement = '';
        //Timeout de sécurité de 15 secondes
        const timeout = setTimeout(() => {
            if (this.isLoadingFiches) {
                this.isLoadingFiches = false;
                this.erreurChargement = 'Impossible de charger les fiches. Vérifiez que le serveur Spring Boot est démarré sur le port 8080.';
            }
        }, 15000);
        this.ficheSvc.getAllFiches().subscribe({
            next : fiches => {
                clearTimeout(timeout);
                this.fiches = fiches;
                this.intitulesUniques = [...new Set(fiches.map(f => f.intitule_poste).filter(Boolean))]
                this.techniquesUniques = [...new Set(fiches.map(f => f.competences_techniques).filter(Boolean))]
                this.comportementalesUniques = [...new Set(fiches.map(f => f.competences_comportementales).filter(Boolean))]
                this.directionsUniques = [...new Set(fiches.map(f => f.direction).filter(Boolean))];
                this.deptUniques = [...new Set(fiches.map(f => f.departement).filter(Boolean))];
                if ((this.activeMenu === '' || this.showGrid) && this.activeRole !== 'ADMIN' && this.activeRole !== 'AUDIT') {
                    this.appliquerFilterEtPaginer(this.getDefaultFiches());
                }
                this.isLoadingFiches = false;
            },
            error: () => {
                clearTimeout(timeout);
                this.erreurChargement = 'Impossible de charger les fiches. Vérifiez que le serveur Spring Boot est démarré sur le port 8080.';
                this.isLoadingFiches = false;
            }
        });
    }
    loadUtilisateurs(): void {
        this.isLoadingUsers = true;
        this.userSvc.getAll().subscribe({
            next: users => { this.utilisateurs = users; this.isLoadingUsers = false; },
            error: () => { this.showAlert('Impossible de charger les utilisateurs.', 'error'); this.isLoadingUsers = false; }
        });
    }
    loadAuditLogs(): void {
        this.isLoadingAudit = true;
        this.auditSvc.getAllLogs().subscribe({
            next: logs => { this.auditLogs = logs; this.isLoadingAudit = false; },
            error: () => { this.showAlert('Erreur lors du chargement de l\'historique.', 'error'); this.isLoadingAudit = false; }
        });
    }


    getDefaultFiches(): FichePoste[] {
        return this.can('READ_ONLY') && !this.can('CREATE_FICHE')
            ? this.fiches.filter(f => f.statut === 'Validée')
            : [...this.fiches];
    }

    //Pagination
    appliquerFilterEtPaginer(liste: FichePoste[]): void {
        this.fichesFiltrees = liste;
        this.pageCourante = 1;
        this.majPage();
    }

    majPage(): void{
        const debut = (this.pageCourante - 1) * PAGE_SIZE;
        this.fichesDuPage = this.fichesFiltrees.slice(debut, debut + PAGE_SIZE);
    }

    allerPage (p: number): void {
        if (p < 1 || p > this.totalPages) return;
        this.pageCourante = p;
        this.majPage();
    }

    //Sélection des fiches
    toggleSelect(ficheId: number): void {
        const next = new Set(this.selectedFiches);
        next.has(ficheId) ? next.delete(ficheId) : next.add(ficheId);
        this.selectedFiches = next;
    }
    isSelected(ficheId: number): boolean {return this.selectedFiches.has(ficheId);}
    get selectedCount(): number {return this.selectedFiches.size;}

    //Détail fiche
    openDetail(fiche: FichePoste): void {
        if (this.isSelectionMode) { this.toggleSelect(fiche.fiche_id); return;}
        this.ficheDetail = fiche;
    }
    closeDetail(): void {this.ficheDetail = null;}

    //Actions sur les fiches
    onValider(): void {
        const ids = [...this.selectedFiches];
        if (!ids.length) { this.showAlert('Sélectionnez au moins une fiche.', 'error'); return}
        this.isLoading = true;
        let done = 0, errors = 0;
        ids.forEach(id => this.ficheSvc.validerFiche(id).subscribe({
            next: () => { 
                done++;
                if (done + errors === ids.length) {
                    this.isLoading = false;
                    this.selectedFiches = new Set(); 
                    this.isSelectionMode = false;
                    this.activeMenu = '';
                    this.loadFiches();
                    this.showAlert(errors > 0 ? `${done} validée(s), ${errors} erreur(s)` : 'Fiche(s) validée(s).', 'success'); 
                }
            },
            error: () => {
                errors++;
                if(done + errors === ids.length) {
                    this.isLoading = false;
                    this.selectedFiches = new Set(); 
                    this.isSelectionMode = false;
                    this.showAlert(`Erreur : ${errors} fiche(s) non traitée(s)`, 'error')}
                }
        }));
    }
    onApprouver(): void {
        const ids = [...this.selectedFiches];
        if (!ids.length) { this.showAlert('Sélectionnez au moins une fiche.', 'error'); return}
        this.isLoading = true;
        let done = 0, errors = 0;
        ids.forEach(id => this.ficheSvc.approuverFiche(id).subscribe({
            next: () => { 
                done++;
                if (done + errors === ids.length) {
                    this.isLoading = false;
                    this.selectedFiches = new Set(); 
                    this.isSelectionMode = false;
                    this.activeMenu = '';
                    this.loadFiches();
                    this.showAlert(errors > 0 ? `${done} approuvée(s), ${errors} erreur(s)` : 'Fiche(s) approuvée(s).', 'success'); 
                }
            },
            error: () => {
                errors++;
                if(done + errors === ids.length) {
                    this.isLoading = false;
                    this.selectedFiches = new Set(); 
                    this.isSelectionMode = false;
                    this.showAlert(`Erreur : ${errors} fiche(s) non traitée(s)`, 'error')}
                }
        }));
    }
    onArchiver(): void {
        const ids = [...this.selectedFiches];
        if (!ids.length) { this.showAlert('Sélectionnez au moins une fiche.', 'error'); return}
        this.isLoading = true;
        let done = 0, errors = 0;
        ids.forEach(id => this.ficheSvc.archiverFiche(id).subscribe({
            next: () => { 
                done++;
                if (done + errors === ids.length) {
                    this.isLoading = false;
                    this.selectedFiches = new Set(); 
                    this.isSelectionMode = false;
                    this.activeMenu = '';
                    this.loadFiches();
                    this.showAlert(errors > 0 ? `${done} archivée(s), ${errors} erreur(s)` : 'Fiche(s) archivée(s).', 'success'); 
                }
            },
            error: () => {
                errors++;
                if(done + errors === ids.length) {
                    this.isLoading = false;
                    this.selectedFiches = new Set(); 
                    this.isSelectionMode = false;
                    this.showAlert(`Erreur : ${errors} fiche(s) non traitée(s)`, 'error')}
                }
        }));
    }
    onModifierFromDetail(): void{
        if (!this.ficheDetail) return;
        const fiche = this.ficheDetail;
        this.ficheToEdit = fiche;
        this.closeDetail();
        this.activeMenu = 'modifier';
        this.populateForm(fiche);
    }
    onSupprimerFromDetail(): void {
        if(!this.ficheDetail) return;
        this.ficheSvc.deleteFiche(this.ficheDetail.fiche_id).subscribe({
            next: () => { this.showAlert('Fiche supprimée.','success'); this.closeDetail(); this.loadFiches();},
            error: () => this.showAlert('Erreur lors de la suppression.', 'error')
        });
    }

    onSelectForEdit(fiche: FichePoste): void {
        this.ficheToEdit = fiche;
        this.isSelectionMode = false;
        this.selectedFiches = new Set();
        this.formSoumis = false;
        this.populateForm(fiche);
    }

    //Formulaires
    initForms(): void {
        this.ficheForm = this.fb.group({
            intitule_poste: ['', Validators.required],
            direction: ['', Validators.required],
            departement: ['', Validators.required],
            service: [''],
            rattachement_hierarchique: [''],
            mission_principale: ['', Validators.required],
            activites_detaillees: [''],
            responsabilites: [''],
            competences_techniques: [''],
            competences_comportementales: [''],
            niveau_etudes: [''],
            experience_minimale: [''],
            certifications: [''],
            kpis: [''],
            risques: ['']
        });
        this.searchForm = this.fb.group({
            intitulePoste: [''],
            direction: [''],
            departement: [''],
            statut: [''],
            competencesTechniques: [''],
            competencesComportementales: ['']
        });
        this.userForm = this.fb.group({
            username: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required,Validators.minLength(6)]] 
        });
        this.auditSearchForm = this.fb.group({
            action: [''],
            startDate: [''],
            endDate: ['']
        });
    }
    //Helper pour afficher une erreur de validation dans le template
    champInvalide(form: FormGroup, champ: string): boolean {
        const ctrl = form.get(champ);
        return !!ctrl && ctrl.invalid && (ctrl.touched || this.formSoumis);
    }
    //Message d'erreur selon le type de validation
    erreurChamp(form: FormGroup, champ: string): string{
        const ctrl = form.get(champ);
        if (!ctrl || !ctrl.errors) return '';
        if (ctrl.errors['required']) return 'Ce champ est obligatoire.';
        if (ctrl.errors['email']) return 'Adresse email invalide';
        if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères`;
        return '';
    }

    populateForm(fiche: FichePoste): void{
        this.ficheForm.patchValue({
            intitule_poste: fiche.intitule_poste,
            direction: fiche.direction,
            departement: fiche.departement,
            service: fiche.service,
            rattachement_hierarchique: fiche.rattachement_hierarchique,
            mission_principale: fiche.mission_principale,
            activites_detaillees: fiche.activites_detaillees,
            responsabilites: fiche.responsabilites,
            competences_techniques: fiche.competences_techniques,
            competences_comportementales: fiche.competences_comportementales,
            niveau_etudes: fiche.niveau_etudes,
            experience_minimale: fiche.experience_minimale,
            certifications: fiche.certifications,
            kpis: fiche.kpis,
            risques: fiche.risques
        });
    }

    onSubmitFiche(): void {
        this.formSoumis = true;
        if (this.ficheForm.invalid) { this.showAlert('Veuillez remplir les champs obligatoires.', 'error'); return;}
        const data = this.ficheForm.value;
        if (this.ficheToEdit) {
            this.ficheSvc.updateFiche(this.ficheToEdit.fiche_id, data).subscribe({
                next:  () => {
                    this.showAlert('Fiche modifiée avec succès.', 'success'); 
                    this.loadFiches(); 
                    this.ficheToEdit = null; 
                    this.ficheForm.reset(); 
                    this.formSoumis = false; 
                    this.activeMenu = '';
                },
                error: () => this.showAlert('Erreur lors de la modification.', 'error')
            });
        } else {
            this.ficheSvc.createFiche(data).subscribe({
                next:  () => {
                    this.showAlert('Fiche créee avec succès.', 'success'); 
                    this.loadFiches(); 
                    this.ficheForm.reset(); 
                    this.formSoumis = false; 
                    this.activeMenu = '';
                },
                error: () => this.showAlert('Erreur lors de la création.', 'error')
            });
        }
    }
    //Recherche
    onSearch(): void {
        const raw = this.searchForm.value;
        const critere: Record<string, string> = {};
        //On n'envoie que les champs remplis
        Object.keys(raw).forEach(k => {
            if (raw[k] !== null && raw[k] !== undefined && raw[k] !== ''){
                critere[k] = raw[k];
            }
        })
        this.ficheSvc.searchFiches(critere as any).subscribe({
            next: results => this.appliquerFilterEtPaginer(results),
            error: () => this.showAlert('Erreur lors de la recherche', 'error')
        });
    }

    reinitRecherche(): void {
        this.searchForm.reset();
        this.appliquerFilterEtPaginer(this.getDefaultFiches());
    }

    //Versions / Audit
    onSearchAudit(): void {
        const { action, startDate, endDate } = this.auditSearchForm.value;
        // Cas 1 : plage de dates (avec ou sans filtre action en plus)
        if (startDate && endDate) {
            this.isLoadingAudit = true;
            this.auditSvc.getLogsByDateRange(startDate, endDate).subscribe({
                next: logs => {
                    this.auditLogs = action ? logs.filter((l: AuditEntry) => l.action === action) : logs;
                    this.filtreHistoriqueFicheId = null;
                    this.isLoadingAudit = false;
                },
                error: () => { this.showAlert('Erreur recherche audit.', 'error'); this.isLoadingAudit = false; }
            });
            return;
        }
        // Cas 2 : action seule
        if (action) {
            this.isLoadingAudit = true;
            this.auditSvc.getLogsByAction(action).subscribe({
                next: logs => { this.auditLogs = logs; this.filtreHistoriqueFicheId = null; this.isLoadingAudit = false; },
                error: () => { this.showAlert('Erreur recherche audit.', 'error'); this.isLoadingAudit = false; }
            });
            return;
        }
        // Cas 3 : aucun filtre
        this.loadAuditLogs();
    }

    reinitAudit(): void {
        this.auditSearchForm.reset();
        this.filtreHistoriqueFicheId = null;
        this.loadAuditLogs();
    }

    onSelectFicheVersion(fiche: FichePoste): void{
        this.selectedFicheVersion = fiche;
        this.auditSvc.getLogsByFiche(fiche.fiche_id).subscribe({
            next: logs => this.versionLogs = logs,
            error: () => this.showAlert('Erreur lors du chargement des versions.','error')
        });
    }

    get auditLogsFiltres(): AuditEntry[] {
        if (this.filtreHistoriqueFicheId == null) return this.auditLogs;
        return this.auditLogs.filter(l => l.ficheId === this.filtreHistoriqueFicheId);
    }

    get ficheIdsUniques(): number[] {
        return [...new Set(this.auditLogs.map(l => l.ficheId).filter((id): id is number => id != null))].sort((a,b) => a-b);
    }

    //Export
    exportPdfSelected(): void{
        const ids = [...this.selectedFiches];
        if (!ids.length) {this.showAlert('Sélectionnez au moins une fiche.', 'error'); return;}
        this.showAlert('Export PDF sélection en cours...', 'success');
        this.ficheSvc.exportPdfSelected(ids).subscribe({
            next: blob => {
                this.downloadBlob(blob, 'fiches-selection.pdf');
                this.showAlert('PDF téléchargé.', 'success');
            },
            error: () => this.showAlert('Erreur lors de l\'export PDF.','error')
        });
    }
    exportPdfAll(): void{
        this.showAlert('Export PDF de toutes les fiches en cours...', 'success');
        this.ficheSvc.exportPdfAll().subscribe({
            next: blob => {
                this.downloadBlob(blob, 'toutes-les-fiches.pdf');
                this.showAlert('PDF téléchargé.', 'success');
            },
            error: () => this.showAlert('Erreur lors de l\'export PDF.','error')
        });
    }
    exportExcel(): void{
        this.showAlert('Export Excel en cours...', 'success');
        this.ficheSvc.exportExcel().subscribe({
            next: blob => {
                this.downloadBlob(blob, 'fiches.xlsx');
                this.showAlert('Excel téléchargé.', 'success');
            },
            error: () => this.showAlert('Erreur lors de l\'export Excel.','error')
        });
    }
    onExportClick(): void {
        switch (this.exportMode) {
            case 'pdf-selected': this.exportPdfSelected(); break;
            case 'pdf-all': this.exportPdfAll(); break;
            case 'excel': this.exportExcel(); break;
        }
    }
    private downloadBlob(blob: Blob, filename: string): void{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    //Administration des utilisateurs
    onCreerUser(): void{
        this.formSoumis = true;
        if(this.userForm.invalid) { this.showAlert('Veuillez remplir tous les champs.', 'error'); return;}
        const payload = {
            username: this.userForm.value.username,
            email: this.userForm.value.email,
            password: this.userForm.value.password,
        };
        this.userSvc.create(this.userForm.value).subscribe({
            next:  () => {
                this.showAlert('Utilisateur créé avec succès.', 'success'); 
                this.userForm.reset(); 
                this.formSoumis = false ;
                this.loadUtilisateurs();
            },
            error: () => this.showAlert('Erreur lors de la création de l\'utilisateur.', 'error')
        });
    }

    onSupprimerUser(): void{
        if(!this.selectedUserId) { this.showAlert('Sélectionnez au moins un utilisateur.', 'error'); return;}
        this.userSvc.delete(this.selectedUserId).subscribe({
            next:  () => {
                this.showAlert('Utilisateur supprimé.', 'success'); 
                this.selectedUserId = null ;
                this.loadUtilisateurs();
            },
            error: () => this.showAlert('Erreur lors de la suppression de l\'utilisateur.', 'error')
        });
    }

    onAssignerRole(): void{
        if(this.assignStep === 1) {
            if (!this.selectedUserId) { this.showAlert('Sélectionnez un utilisateur.', 'error'); return;}
            this.assignStep = 2;
        } else {
            this.executerAssignation();
        }
    }

    executerAssignation(): void {
        if (!this.selectedNewRole) { this.showAlert('Sélectionnez un rôle.', 'error'); return;}
        const user = this.utilisateurs.find(u => u.id === this.selectedUserId);
        if (!user) { this.showAlert('Utilisateur introuvable', 'error'); return; }
        const roleIdMap: Record<string, number> = {
            'RH': 1, 'MANAGER': 2, 'DCH': 3, 'AGENT': 4, 'AUDIT': 5, 'ADMIN': 6
        };
        const roleId = roleIdMap[this.selectedNewRole];
        if (!roleId) { this.showAlert('Rôle inconnu.', 'error'); return; }
        this.userSvc.assignRoleByEmail(user.email, roleId).subscribe({
            next: () => {
                this.showAlert(`Rôle ${this.getRoleLabel(this.selectedNewRole!)} assigné à ${user.username}.`, 'success');
                this.assignStep = 1;
                this.selectedUserId = null;
                this.selectedNewRole = null;
                this.loadUtilisateurs();
            },
            error: () => this.showAlert('Erreur lors de l\'assignation du rôle.', 'error')
        });
    }
    //Modale de confirmation
    demanderConfirmation(action: string, fiche?: FichePoste): void {
        const nb = this.selectedFiches.size;
        const label = fiche? `"${fiche.intitule_poste}"` : `${nb} fiche(s) sélectionnées(s)`;
        switch (action) {
            case 'supprimer-fiche':
                this.confirmation = {visible: true, type: 'danger',
                    titre: 'Supprimer la fiche', message: 'Cette action est irréversible.',
                    details: label, labelOk: 'Supprimer',
                    action: () => {this.ficheDetail = fiche!; this.onSupprimerFromDetail();}
                };
                break;
            case 'archiver-selection':
                this.confirmation = {visible: true, type: 'warning',
                    titre: 'Archiver les fiches', message: 'Ces fiches ne seront plus modifiables.',
                    details: `${nb} fiche(s) sélectionnées(s)`, labelOk: 'Archiver',
                    action: () => this.onArchiver()
                };
                break;
            case 'valider':
                this.confirmation = {visible: true, type: 'success',
                    titre: 'Valider les fiches', message: 'Elles passeront au statut "En validation".',
                    details: `${nb} fiche(s) sélectionnées(s)`, labelOk: 'Valider',
                    action: () => this.onValider()
                };
                break;
            
            case 'approuver':
                this.confirmation = {visible: true, type: 'success',
                    titre: 'Approuver les fiches', message: 'Elles passeront au statut "Validée".',
                    details: `${nb} fiche(s) sélectionnées(s)`, labelOk: 'Approuver',
                    action: () => this.onApprouver()
                };
                break;
            case 'archiver-fiche':
                this.confirmation = {visible: true, type: 'warning',
                    titre: 'Archiver la fiche', message: 'Cette fiche ne sera plus modifiable".',
                    details: label, labelOk: 'Archiver',
                    action: () => { this.selectedFiches.add(fiche!.fiche_id); this.closeDetail(); this.onArchiver(); }
                };
                break
            case 'valider-fiche':
                this.confirmation = {visible: true, type: 'success',
                    titre: 'Valider la fiche', message: 'Elle passera au statut "En validation".',
                    details: label, labelOk: 'Valider',
                    action: () => { this.selectedFiches.add(fiche!.fiche_id); this.closeDetail(); this.onValider(); }
                };
                break;
            case 'supprimer-user':
                const userASuppr = this.utilisateurs.find(u => u.id === this.selectedUserId);
                this.confirmation = {visible: true, type: 'danger',
                    titre: 'Supprimer l\'utilisateur',
                    message: 'Cette action est irréversible. L\'utilisateur sera définitivement supprimé.',
                    details: userASuppr ? `${userASuppr.username} (${userASuppr.email})` : '',
                    labelOk: 'Supprimer',
                    action: () => this.onSupprimerUser()
                };
                break;
            case 'assigner-role':
                const userAAssigner = this.utilisateurs.find(u => u.id === this.selectedUserId);
                this.confirmation = {visible: true, type: 'success',
                    titre: 'Assigner un rôle',
                    message: `Confirmer l'assignation du rôle "${this.getRoleLabel(this.selectedNewRole!)}"`,
                    details: userAAssigner ? `à ${userAAssigner.username} (${userAAssigner.email})` : '',
                    labelOk: 'Assigner',
                    action: () => this.executerAssignation()
                };
                break;
        }
    }
    executerConfirmation(): void{ const fn = this.confirmation.action; this.annulerConfirmation(); fn();}
    annulerConfirmation(): void{this.confirmation = {...CONFIRMATION_VIDE};}

    // Thème / Deconnexion / Helpers
    toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed}
    toggleTheme(): void {
        const wrapper = document.querySelector('.dashboard-wrapper');
        wrapper?.classList.add('theme-transitioning');
        this.isDark = !this.isDark;
        setTimeout(() => wrapper?.classList.remove('theme-transitioning'), 400);
    }
    logout(): void {this.authSvc.logout(); this.router.navigate(['/login']);}

    showAlert(msg: string, type: 'success' | 'error'): void {
        this.alertMsg = msg;
        this.alertType = type;
        setTimeout(() => this.alertMsg = '', 4000);
    }

    getIcon(name: string): string {
        return this.isDark ? `assets/icons/${name} white.png` : `assets/icons/${name}.png`;
    }

    getStatutClass(statut: string): string {
        const map: Record<string, string> = {
            'Brouillon': 'statut-brouillon',
            'En validation': 'statut-en-validation',
            'Validée': 'statut-validee',
            'Archivée': 'statut-archivee',
        };
        return map[statut] ?? '';
    };

    getRoleLabel(role: string): string { return ROLE_LABELS[role as RoleApp] ?? role;}

    @HostListener('document:click', ['$event'])
    onDocClick(e: MouseEvent): void {
        if (!(e.target as HTMLElement).closest('.user-zone')) {
            this.showRoleDropdown = false
        };
    }

    get hasMultipleRoles(): boolean { return (this.currentUser.roles.length ?? 0) > 1;}
    get allRoles(): string[] { return this.currentUser.roles;}

    newSet(...ids: number[]): Set<number> {return new Set(ids);}

    get showGrid(): boolean {
        if (this.activeRole === 'ADMIN' || this.activeRole === 'AUDIT') {
            // Admin et Audit n'ont jamais la grille des fiches sur ''
            // Seul AUDIT peut avoir la grille via 'consulter' et 'version'
            if (this.activeRole === 'ADMIN') return false;
            return ['consulter', 'version', 'rechercher'].includes(this.activeMenu)
                || (this.activeMenu === 'version' && !this.ficheToEdit);
        }
        return ['', 'rechercher', 'archiver', 'valider', 'approuver',
            'exporter','selectionner', 'version', 'consulter'].includes(this.activeMenu)
            || (this.activeMenu === 'modifier' && !this.ficheToEdit);
    }

    formatDate(dateStr: string): string {
        if(!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    }
}