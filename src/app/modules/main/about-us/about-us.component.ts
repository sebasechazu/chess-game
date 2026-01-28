import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@Component({
    selector: 'app-about-us',
    imports: [CommonModule, NavbarComponent, MatIconModule],
    templateUrl: './about-us.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutUsComponent {
    team = [
        {
            name: 'Sebastian Echazu',
            role: 'Programador',
            description: 'Arquitecto de código y apasionado del ajedrez digital. Enfocado en crear sistemas fluidos y robustos.',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver'
        },
        {
            name: 'Natalia Alamo',
            role: 'Diseñadora',
            description: 'Diseñadora visual experta en interfaces de usuario. Natalia aporta la elegancia y modernidad a cada tablero.',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eden'
        },
        {
            name: 'ChessBot',
            role: 'La Mente Maestra',
            description: 'Nuestra IA integrada mediante Web Workers. Utiliza algoritmos Minimax con poda Alfa-Beta y tablas de transposición para calcular jugadas óptimas sin bloquear la interfaz.',
            image: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gemini'
        }
    ];
}
