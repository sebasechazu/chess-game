import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-navbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink],
    templateUrl: './navbar.component.html'
})
export class NavbarComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    user = this.authService.user;

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
