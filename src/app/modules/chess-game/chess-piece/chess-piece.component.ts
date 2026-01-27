import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessPiece } from '../../../core/helpers/interfaces';

/**
 * Componente de presentación para una pieza de ajedrez individual
 * Maneja la visualización y animaciones de las piezas
 */
@Component({
  selector: 'app-chess-piece',
  templateUrl: './chess-piece.component.html',
  styleUrl: './chess-piece.component.css',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChessPieceComponent {

  /** Pieza de ajedrez a mostrar */
  piece = input.required<ChessPiece>();

  /** Indica si la pieza está en movimiento para activar la animación */
  isMoving = input<boolean>(false);

  private readonly basePath = '/assets/img/chess/';
  private readonly fallbackImage = '/assets/img/chess/fallback-piece.svg';

  /** Ruta de la imagen de la pieza */
  protected readonly imageSrc = computed(() => {
    const piece = this.piece();
    if (!piece) return this.fallbackImage;
    return `${this.basePath}${piece.color}-${piece.type}.svg`;
  });

  /** Texto alternativo para accesibilidad */
  protected readonly altText = computed(() => {
    const piece = this.piece();
    if (!piece) return '';
    return `${this.capitalizeFirst(piece.type)} ${piece.color}`;
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
}
