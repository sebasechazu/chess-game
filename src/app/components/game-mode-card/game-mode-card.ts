import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'game-mode-card',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
    templateUrl: './game-mode-card.html'
})
export class GameModeCard {

    type = input.required<'pvp' | 'pvai'>();
    title = input.required<string>();
    description = input.required<string>();
    buttonText = input.required<string>();

    /**
     * Clase CSS para el fondo y borde del icono.
     */
    iconBadgeClass() {
        return this.type() === 'pvp'
            ? 'bg-app-accent border-app-accent/20'
            : 'bg-app-muted/20 border-app-border/30';
    }

    /**
     * Clase CSS para el color del icono.
     */
    iconClass() {
        return this.type() === 'pvp' ? 'text-text-primary' : 'text-app-accent';
    }

    /**
     * Clase CSS para el botón.
     */
    buttonClass() {
        return this.type() === 'pvp'
            ? 'bg-app-accent border-app-accent text-text-primary hover:bg-transparent hover:text-text-primary hover:shadow-app-accent/30'
            : 'bg-app-surface border-app-border text-text-primary hover:bg-transparent hover:text-text-primary hover:shadow-app-surface/30';
    }
}
