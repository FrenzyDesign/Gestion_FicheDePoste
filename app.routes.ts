import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { NgModule } from '@angular/core';

 
export const routes: Routes = [
    //Page par défaut → Login
    {path: '', redirectTo: 'login', pathMatch: 'full'},

    //Page de connexion
    {path: 'login', component: LoginComponent},

    //Dashboard
    {
        path: 'dashboard',
        canActivate: [AuthGuard],
        //Lazy loading
        loadChildren: () =>
            import('./pages/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
    },

    //Toute autre route → Login
    { path: '**', redirectTo: 'login'}
 ];
 @NgModule({
    imports: [
        RouterModule.forRoot(routes) //Enregistrement des routes
],
    exports: [
        RouterModule //Export pour toute l'application
    ]
})
export class AppRoutes {}