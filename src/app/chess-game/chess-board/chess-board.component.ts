import { Component, input, output, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { ChessSquare, SquareColor, PieceColor, MoveResult } from '../../helpers/interfaces';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { ChessPieceComponent } from "../chess-piece/chess-piece.component";

/**
 * Componente de presentación del tablero de ajedrez
 * Maneja la visualización y las interacciones drag & drop
 */
@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
  standalone: true,
  imports: [ChessPieceComponent, DragDropModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChessBoardComponent {

  readonly columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  readonly rows = [8, 7, 6, 5, 4, 3, 2, 1];
  readonly SquareColor = SquareColor; 
  
  board = input.required<ChessSquare[][]>();
  currentTurn = input.required<PieceColor>(); 
  gameOver = input<boolean>(false);
  animate = input<boolean>(true);
  validateMove = input<(from: string, to: string) => MoveResult>();
  
  moveAttempt = output<{ from: string; to: string }>();

  public hoveredSquare = signal<string | null>(null);
  public dragging = signal<string | null>(null);

  /**
   * Valida si el movimiento actual (mientras se arrastra) es legal.
   * Se recalcula automáticamente cuando cambia la pieza arrastrada o la casilla de hover.
   */
  public lastMoveValid = computed(() => {
    const from = this.dragging();
    const to = this.hoveredSquare();
    const validateFn = this.validateMove();

    if (from && to && validateFn) {
      return validateFn(from, to).success;
    }
    return null;
  });

  /**
   * Maneja el evento drop de una pieza en el tablero
   */
  onPieceDrop(event: CdkDragDrop<ChessSquare>) {
    const sourceSquare = event.previousContainer.data;
    const targetSquare = event.container.data;
    
    this.dragging.set(null);
    this.hoveredSquare.set(null);
    
    if (!sourceSquare || !targetSquare) return;
    
    const sourcePosition = sourceSquare.position;
    const targetPosition = targetSquare.position;
    const movingPiece = sourceSquare.piece;
    
    if (!movingPiece || sourcePosition === targetPosition) return;

    this.moveAttempt.emit({ from: sourcePosition, to: targetPosition });
  }

  /**
   * Inicia el arrastre de una pieza
   */
  onDragStarted(square: ChessSquare) {
    this.dragging.set(square.position);
    this.hoveredSquare.set(null);
  }

  /**
   * Finaliza el arrastre de una pieza
   */
  onDragEnded() {
    this.dragging.set(null);
    this.hoveredSquare.set(null);
  }

  /**
   * Maneja cuando una pieza entra en hover sobre una casilla
   */
  onSquareDragEnter(square: ChessSquare) {
    if (this.dragging()) {
      this.hoveredSquare.set(square.position);
    }
  }

  /**
   * Maneja cuando una pieza sale del hover de una casilla
   */
  onSquareDragLeave(square: ChessSquare) {
    if (this.hoveredSquare() === square.position) {
      this.hoveredSquare.set(null);
    }
  }
}
