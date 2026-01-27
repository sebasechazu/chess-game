import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly _user = signal<any | null>(null);
    readonly user = this._user.asReadonly();

    login(credentials: any): boolean {
        console.log('Login attempt:', credentials);
        // Hardcoded credentials check
        if (credentials.email === 'usuario' && credentials.password === 'test1234') {
            this._user.set({ email: credentials.email, name: 'Sample User' });
            return true;
        }
        return false;
    }

    register(data: any) {
        console.log('Register attempt:', data);
        // Simulate register
        this._user.set({ email: data.email, name: data.name });
    }

    recoverPassword(email: string) {
        console.log('Recover password for:', email);
        // Simulate recovery
    }

    logout() {
        this._user.set(null);
    }
}
