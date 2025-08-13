import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessPiece } from '../../helpers/interfaces';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * Componente de presentación para una pieza de ajedrez individual
 * Maneja la visualización y animaciones de las piezas
 */
@Component({
  selector: 'app-chess-piece',
  templateUrl: './chess-piece.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('pieceMove', [
      state('moving', style({
        transform: 'scale(1.1) rotate(5deg)',
        filter: 'brightness(1.2)',
        zIndex: 100
      })),
      state('idle', style({
        transform: 'scale(1) rotate(0deg)',
        filter: 'brightness(1)',
        zIndex: 'auto'
      })),
      transition('idle => moving', animate('150ms ease-out')),
      transition('moving => idle', animate('200ms ease-in'))
    ])
  ]
})
export class ChessPieceComponent {

  @Input({ required: true }) piece!: ChessPiece;
  @Input() isMoving: boolean = false;
  
  private readonly basePath = 'assets/img/chess/';
  private readonly fallbackImage = 'assets/img/chess/fallback-piece.svg';

  /** Ruta de la imagen de la pieza */
  protected readonly imageSrc = computed(() => {
    if (!this.piece) return this.fallbackImage;
    return `${this.basePath}${this.piece.color}-${this.piece.type}.svg`;
  });

  /** Texto alternativo para accesibilidad */
  protected readonly altText = computed(() => {
    if (!this.piece) return '';
    return `${this.capitalizeFirst(this.piece.type)} ${this.piece.color}`;
  });

  /**
   * Capitaliza la primera letra de un texto
   * @param text - Texto a capitalizar
   * @returns Texto con la primera letra en mayúscula
   */
  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Maneja errores de carga de imagen usando fallback
   * @param event - Evento de error de la imagen
   */
  protected onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement.src !== this.fallbackImage) {
      console.warn(`Failed to load chess piece image: ${imgElement.src}`);
      imgElement.src = this.fallbackImage;
    }
  }

  /**
   * Determina el estado de animación de la pieza
   * @returns Estado de la animación ('moving' o 'idle')
   */
  getMoveState(): string {
    return this.isMoving ? 'moving' : 'idle';
  }
}
