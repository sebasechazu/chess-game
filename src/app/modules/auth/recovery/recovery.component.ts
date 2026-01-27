import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-recovery',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './recovery.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);

    protected readonly isLoading = signal(false);
    protected readonly isSent = signal(false);

    readonly recoveryForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    onSubmit() {
        if (this.recoveryForm.valid) {
            this.isLoading.set(true);
            // Simulate API call
            setTimeout(() => {
                this.authService.recoverPassword(this.recoveryForm.value.email!);
                this.isLoading.set(false);
                this.isSent.set(true);
            }, 1500);
        }
    }
}
