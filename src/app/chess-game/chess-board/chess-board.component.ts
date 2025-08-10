import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { ChessSquare } from '../../interfaces/chess-square.interface';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { ChessPieceComponent } from "../chess-piece/chess-piece.component";
import { ChessService } from '../../services/chess.service';
import { PieceColor } from '../../interfaces/chess-piece.interface';

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  imports: [ChessPieceComponent, DragDropModule, NgClass],
})
export class ChessBoardComponent {
  @Input() board: ChessSquare[][] = [];
  @Input() currentTurn!: PieceColor;
  @Input() gameOver!: boolean;
  @Output() pieceDrop = new EventEmitter<{ source: string; target: string; valid: boolean }>();
  readonly chessService = inject(ChessService);

  public dragging: string | null = null;

  onPieceDrop(event: CdkDragDrop<ChessSquare>) {

    this.dragging = null;
    const sourceSquare = event.previousContainer.data;
    const targetSquare = event.container.data;
    if (!sourceSquare || !targetSquare) {
      this.pieceDrop.emit({ source: '', target: '', valid: false });
      return;
    }
    const sourcePosition = sourceSquare.position;
    const targetPosition = targetSquare.position;
    const movingPiece = sourceSquare.piece;
    if (!movingPiece || movingPiece.color !== this.currentTurn) {
      this.pieceDrop.emit({ source: '', target: '', valid: false });
      return;
    }
    const currentBoard = [...this.board];
    if (this.chessService.isLegalMove(currentBoard, sourcePosition, targetPosition)) {
      this.chessService.movePiece(currentBoard, sourcePosition, targetPosition);
      this.chessService.currentTurn.update(turn => turn === PieceColor.White ? PieceColor.Black : PieceColor.White);
      this.chessService.board.set([...currentBoard]);
      this.chessService.checkGameStatus();
      this.pieceDrop.emit({ source: sourcePosition, target: targetPosition, valid: true });
    } else {
      this.pieceDrop.emit({ source: sourcePosition, target: targetPosition, valid: false });
    }
  }

  onDragStarted(square: ChessSquare) {
    this.dragging = square.position;
  }
}
