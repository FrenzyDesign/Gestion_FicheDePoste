import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { CommonModule, NgClass } from "@angular/common";

@Component({
    selector: 'app-login',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgClass
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    //Formulaire
    loginForm!: FormGroup;

    //Etat de l'UI
    showPassword = false;
    emailFocused = false;
    passwordFocused = false;
    isLoading = false;
    helpVisible = false;

    //Message d'alerte
    message = '' //Texte du message
    messageType: 'success' | 'error' = 'error'; //Type de message

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private authSvc: AuthService
    ) {}

    ngOnInit(): void{
        //Construction du formulaire réactif
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(1)]],
            remember: [false]
        });

        //Si un token JWT validé déjà présent, rediriger
        if (this.authSvc.isLoggedIn()) {
            this.router.navigate(['/dashboard']);
        }
    }
    //Soumission du formulaire
    onSubmit(): void {
        //Marquer tous les champs comme touchés pour afficher les erreurs
        this.loginForm.markAllAsTouched();

        if (this.loginForm.invalid) {
            this.showMessage('Veuillez remplir correctement tous les champs.', 'error');
            return;
        }

        const {email, password, remember} = this.loginForm.value;
        this.isLoading =  true;
        this.clearMessage();

        //Appel au service d'authentification
        this.authSvc.login(email,password).subscribe({
            next: (response) => {
                this.isLoading = false;

                //Stocker le token (localStorage ou sessionStorage)
                this.authSvc.storeSession(response, remember);

                //Message de bienvenue bref
                this.showMessage('Bienvenue, ${response.username} !', 'success');

                //Redirection vers le dashboard après 800ms
                setTimeout(() => {
                    this.router.navigate(['/dashboard']);
                }, 1800);
            },
            error: (err) => {

                this.isLoading = false;
                //Gestion des codes d'erreur HTTP
                if(err.status === 401 || err.status === 403) {
                    this.showMessage('Email ou mot de passe incorrect.', 'error');
                } else if (err.status === 0) {
                    this.showMessage('Impossible de joindre le serveur. Vérifiez votre connexion', 'error');
                } else {
                    this.showMessage('Une erreur inattendue s\'est produite. Veuillez réessayer', 'error');
                }
            }
        });
    }
    //Helpers
    //Afficher/masquer le mot de passe
    togglePassword(): void{
        this.showPassword = !this.showPassword;
    }

    //Clic sur "Mot de passe oublié ?"
    onForgotPassword(event: Event): void {
        event.preventDefault();
        this.showMessage(
      'Veuillez contacter l\'administrateur pour réinitialiser votre mot de passe.',
      'error'
    );
    }

    //Ouvrir "Besoin d'aide ?"
    showHelp(): void {
        this.helpVisible = true;
    }
    
    //Fermer "Besoin d'aide ?"
    closeHelp(): void {
        this.helpVisible = false;
    }

    //Afficher un message d'alerte
    private showMessage(text: string, type: 'success' | 'error'): void {
        this.message = text;
        this.messageType = type;

        //Auto-effacement après 5 secondes pour les messages d'erreur
        if(type === 'error') {
            setTimeout(() => this.clearMessage, 5000);
        }
    }

    //Effacer le message alerte
    private clearMessage(): void{
        this.message = '';
    }
}