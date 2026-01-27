import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@Component({
    selector: 'app-about-us',
    imports: [CommonModule, NavbarComponent],
    templateUrl: './about-us.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutUsComponent {
    team = [
        {
            name: 'Sebastian Chazu',
            role: 'Lead Developer & Architect',
            description: 'Apasionado por el ajedrez y la ingeniería de software, dedicado a crear la mejor experiencia para jugadores de todos los niveles.',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sebastian'
        },
        {
            name: 'Alpha Zero',
            role: 'AI Engine Specialist',
            description: 'Nuestra inteligencia artificial personalizada que ayuda a miles de usuarios a mejorar sus tácticas diariamente.',
            image: 'https://api.dicebear.com/7.x/bottts/svg?seed=ChessAI'
        }
    ];

    stats = [
        { label: 'Partidas Jugadas', value: '500K+' },
        { label: 'Usuarios Activos', value: '10K+' },
        { label: 'Países', value: '120+' },
        { label: 'Rating Promedio', value: '1450' }
    ];
}
