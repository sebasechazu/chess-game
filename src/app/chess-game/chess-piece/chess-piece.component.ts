

import { Component, Input } from '@angular/core';
import { CommonModule,NgOptimizedImage } from '@angular/common';
import { ChessPiece } from '../../interfaces/chess-piece.interface';


@Component({
  selector: 'app-chess-piece',
  templateUrl: './chess-piece.component.html',
  imports: [CommonModule, NgOptimizedImage]
})
export class ChessPieceComponent {
  @Input() piece!: ChessPiece;

  get imageSrc(): string {
    if (!this.piece) return '';
    const base = 'assets/img/chess/';
    return `${base}${this.piece.color}-${this.piece.type}.svg`;
  }
}
