import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(false);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected readonly loginError = signal(false);

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.loginError.set(false);
      // Simulate API call
      setTimeout(() => {
        const success = this.authService.login(this.loginForm.value);
        this.isLoading.set(false);
        if (success) {
          this.router.navigate(['/game']);
        } else {
          this.loginError.set(true);
        }
      }, 1000);
    }
  }
}
