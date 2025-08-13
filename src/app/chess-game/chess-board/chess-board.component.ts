import { Component, input, output } from '@angular/core';
import { ChessSquare, SquareColor, PieceColor } from '../../helpers/interfaces';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { ChessPieceComponent } from "../chess-piece/chess-piece.component";
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

/**
 * Componente de presentación del tablero de ajedrez
 * Maneja la visualización y las interacciones drag & drop
 */
@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  imports: [ChessPieceComponent, DragDropModule, NgClass],
  animations: [
    trigger('boardAppear', [
      transition(':enter', [
        query('.chess-square-container', [
          style({ opacity: 0, transform: 'translateY(30px) scale(0.8)' }),
          stagger(20, [
            animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
              style({ opacity: 1, transform: 'translateY(0) scale(1)' })
            )
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ChessBoardComponent {

  readonly columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  readonly rows = [8, 7, 6, 5, 4, 3, 2, 1];
  readonly SquareColor = SquareColor; 
  
  board = input<ChessSquare[][]>([]);
  currentTurn = input<PieceColor>(PieceColor.White); 
  gameOver = input<boolean>(false);
  
  moveAttempt = output<{ from: string; to: string }>();

  public hoveredSquare: string | null = null;
  public dragging: string | null = null;
  public lastMoveValid: boolean | null = null;

  /**
   * Maneja el evento drop de una pieza en el tablero
   * @param event - Evento de drag and drop del CDK
   */
  onPieceDrop(event: CdkDragDrop<ChessSquare>) {
    this.dragging = null;
    this.hoveredSquare = null;
    
    const sourceSquare = event.previousContainer.data;
    const targetSquare = event.container.data;
    
    if (!sourceSquare || !targetSquare) {
      this.lastMoveValid = null;
      return;
    }
    
    const sourcePosition = sourceSquare.position;
    const targetPosition = targetSquare.position;
    const movingPiece = sourceSquare.piece;
    
    if (!movingPiece || sourcePosition === targetPosition) {
      this.lastMoveValid = null;
      return;
    }

    this.moveAttempt.emit({ from: sourcePosition, to: targetPosition });
    this.lastMoveValid = true;
    
    setTimeout(() => {
      this.lastMoveValid = null;
    }, 1000);
  }

  /**
   * Inicia el arrastre de una pieza
   * @param square - Casilla que contiene la pieza a arrastrar
   */
  onDragStarted(square: ChessSquare) {
    this.dragging = square.position;
    this.lastMoveValid = null;
    this.hoveredSquare = null;
  }

  /**
   * Finaliza el arrastre de una pieza
   */
  onDragEnded() {
    if (this.lastMoveValid === null) {
      this.dragging = null;
      this.hoveredSquare = null;
    }
  }

  /**
   * Maneja cuando una pieza entra en hover sobre una casilla
   * @param square - Casilla sobre la que se está haciendo hover
   */
  onSquareDragEnter(square: ChessSquare) {
    if (!this.dragging) return;
    
    this.hoveredSquare = square.position;
    this.lastMoveValid = true;
  }

  /**
   * Maneja cuando una pieza sale del hover de una casilla
   * @param square - Casilla de la que se sale el hover
   */
  onSquareDragLeave(square: ChessSquare) {
    if (this.hoveredSquare === square.position) {
      this.hoveredSquare = null;
      this.lastMoveValid = null;
    }
  }
}
