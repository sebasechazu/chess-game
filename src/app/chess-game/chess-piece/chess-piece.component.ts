import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChessPiece {
  id: number;
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  position: string;
  image: string;
  hasMoved?: boolean;
}

@Component({
  selector: 'app-chess-piece',
  template: `
    <div class="chess-piece" [class.white]="piece.color === 'white'" [class.black]="piece.color === 'black'">
      <img [src]="piece.image" [alt]="piece.type + ' ' + piece.color" class="piece-image">
    </div>
  `,
  styles: [`
    .chess-piece {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10;
      cursor: grab;
    }
    .piece-image {
      width: 80%;
      height: 80%;
      object-fit: contain;
      pointer-events: none; /* Importante para evitar problemas con el drag */
      user-select: none;
      -webkit-user-drag: none;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class ChessPieceComponent {
  @Input() piece!: ChessPiece;
}
