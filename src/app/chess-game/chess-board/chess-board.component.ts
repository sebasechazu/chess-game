
import { Component, model, Input } from '@angular/core';
import { ChessSquare } from '../../interfaces/chess-square.interface';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { ChessPieceComponent } from "../chess-piece/chess-piece.component";
import { PieceColor } from '../../interfaces/chess-piece.interface';

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  imports: [ChessPieceComponent, DragDropModule, NgClass],
})
export class ChessBoardComponent {

  readonly columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  readonly rows = [8, 7, 6, 5, 4, 3, 2, 1];

  board = model<ChessSquare[][]>([]);
  currentTurn = model<PieceColor>(); 
  gameOver = model<boolean>(); 
  
  public dragging: string | null = null;

  onPieceDrop(event: CdkDragDrop<ChessSquare>) {
  this.dragging = null;
  const sourceSquare = event.previousContainer.data;
  const targetSquare = event.container.data;
  if (!sourceSquare || !targetSquare) return;
  const sourcePosition = sourceSquare.position;
  const targetPosition = targetSquare.position;
  const movingPiece = sourceSquare.piece;
  if (!movingPiece) return;
  const newBoard = this.board().map(row => row.map(square => ({ ...square })));
  const [sourceFile, sourceRank] = sourcePosition.split('');
  const sourceCol = sourceFile.charCodeAt(0) - 97;
  const sourceRow = 8 - parseInt(sourceRank);
  const [targetFile, targetRank] = targetPosition.split('');
  const targetCol = targetFile.charCodeAt(0) - 97;
  const targetRow = 8 - parseInt(targetRank);
  newBoard[targetRow][targetCol].piece = { ...movingPiece, position: targetPosition };
  newBoard[sourceRow][sourceCol].piece = null;
  this.board.set(newBoard);
  }

  onDragStarted(square: ChessSquare) {
    this.dragging = square.position;
  }
}
