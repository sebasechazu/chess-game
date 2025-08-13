import { Component, model, input, computed } from '@angular/core';
import { ChessSquare, SquareColor } from '../../interfaces/chess-square.interface';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { ChessPieceComponent } from "../chess-piece/chess-piece.component";
import { PieceColor, ChessPiece, PieceType } from '../../interfaces/chess-piece.interface';
import { isValidPawnMove, isValidRookMove, isValidKnightMove, isValidBishopMove, isValidQueenMove, isValidKingMove } from '../../services/chess-move-rules';

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  imports: [ChessPieceComponent, DragDropModule, NgClass],
})
export class ChessBoardComponent {

  readonly columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  readonly rows = [8, 7, 6, 5, 4, 3, 2, 1];
  readonly SquareColor = SquareColor; 
  board = model<ChessSquare[][]>([]);
  currentTurn = model<PieceColor>(PieceColor.White); 
  gameOver = model<boolean>(false); 

  public hoveredSquare: string | null = null;
  
  public dragging: string | null = null;
  public lastMoveValid: boolean | null = null;

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
    
    if (!movingPiece) {
      this.lastMoveValid = null;
      return;
    }

    if (sourcePosition === targetPosition) {
      this.lastMoveValid = null;
      return;
    }
    const boardSnapshot = this.board();
    const isValid = this.isLegalMove(boardSnapshot, sourcePosition, targetPosition);
    this.lastMoveValid = isValid;

    if (isValid) {
      const newBoard = boardSnapshot.map(row => row.map(square => ({ ...square })));
      const [sourceFile, sourceRank] = sourcePosition.split('');
      const sourceCol = sourceFile.charCodeAt(0) - 97;
      const sourceRow = 8 - parseInt(sourceRank);
      const [targetFile, targetRank] = targetPosition.split('');
      const targetCol = targetFile.charCodeAt(0) - 97;
      const targetRow = 8 - parseInt(targetRank);
      
      const updatedPiece = { ...movingPiece, position: targetPosition, hasMoved: true };
      newBoard[targetRow][targetCol].piece = updatedPiece;
      newBoard[sourceRow][sourceCol].piece = null;
      
      this.board.set(newBoard);
      
      const nextTurn = this.currentTurn() === PieceColor.White ? PieceColor.Black : PieceColor.White;
      this.currentTurn.set(nextTurn);
    }

    setTimeout(() => {
      this.lastMoveValid = null;
    }, 1000);
  }

  isLegalMove(board: ChessSquare[][], sourcePos: string, targetPos: string): boolean {
    const [sourceFile, sourceRank] = sourcePos.split('');
    const sourceCol = sourceFile.charCodeAt(0) - 97;
    const sourceRow = 8 - parseInt(sourceRank);
    const [targetFile, targetRank] = targetPos.split('');
    const targetCol = targetFile.charCodeAt(0) - 97;
    const targetRow = 8 - parseInt(targetRank);
    const piece = board[sourceRow][sourceCol].piece;
    const targetSquare = board[targetRow][targetCol];
    if (!piece) return false;
    if (targetSquare.piece && targetSquare.piece.color === piece.color) {
      return false;
    }
    switch (piece.type) {
      case PieceType.Pawn:
        return isValidPawnMove(board, piece, [sourceRow, sourceCol], [targetRow, targetCol]);
      case PieceType.Rook:
        return isValidRookMove(board, piece, [sourceRow, sourceCol], [targetRow, targetCol]);
      case PieceType.Knight:
        return isValidKnightMove(board, piece, [sourceRow, sourceCol], [targetRow, targetCol]);
      case PieceType.Bishop:
        return isValidBishopMove(board, piece, [sourceRow, sourceCol], [targetRow, targetCol]);
      case PieceType.Queen:
        return isValidQueenMove(board, piece, [sourceRow, sourceCol], [targetRow, targetCol]);
      case PieceType.King:
        return isValidKingMove(board, piece, [sourceRow, sourceCol], [targetRow, targetCol]);
      default:
        return false;
    }
  }

  onDragStarted(square: ChessSquare) {
    this.dragging = square.position;
    this.lastMoveValid = null;
    this.hoveredSquare = null;
  }

  onDragEnded() {

    if (this.lastMoveValid === null) {
      this.dragging = null;
      this.hoveredSquare = null;
    }
  }

  onSquareDragEnter(square: ChessSquare) {
    if (!this.dragging) return;
    this.hoveredSquare = square.position;
    const boardSnapshot = this.board();
    this.lastMoveValid = this.isLegalMove(boardSnapshot, this.dragging, square.position);
  }

  onSquareDragLeave(square: ChessSquare) {
    if (this.hoveredSquare === square.position) {
      this.hoveredSquare = null;
      this.lastMoveValid = null;
    }
  }
}
