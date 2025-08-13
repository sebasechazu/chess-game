import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChessPiece } from '../../interfaces/chess-piece.interface';

@Component({
  selector: 'app-chess-piece',
  templateUrl: './chess-piece.component.html',
  imports: [CommonModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChessPieceComponent {

 @Input({ required: true }) piece!: ChessPiece;
  
  private readonly basePath = 'assets/img/chess/';
  private readonly fallbackImage = 'assets/img/chess/fallback-piece.svg';

  protected readonly imageSrc = computed(() => {
    if (!this.piece) return this.fallbackImage;
    return `${this.basePath}${this.piece.color}-${this.piece.type}.svg`;
  });

  protected readonly altText = computed(() => {
    if (!this.piece) return '';
    return `${this.capitalizeFirst(this.piece.type)} ${this.piece.color}`;
  });

  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  protected onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement.src !== this.fallbackImage) {
      console.warn(`Failed to load chess piece image: ${imgElement.src}`);
      imgElement.src = this.fallbackImage;
    }
  }
}
