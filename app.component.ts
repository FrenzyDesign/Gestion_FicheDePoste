import { Component } from "@angular/core";
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    template: `<router-outlet></router-outlet>`,
    styles : [`
        :host {
            display: block;
            height: 100%;
        }
        `],
    imports: [RouterOutlet]
})
export class AppComponent {
    title = 'bhs-gestion-fiches';
}