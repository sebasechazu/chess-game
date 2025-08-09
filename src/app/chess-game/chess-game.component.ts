import { Component, OnInit, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { ChessService } from '../services/chess.service';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { ModalGameComponent } from '../shared/modal-game/modal-game.component';
import { SpinnerGameComponent } from '../shared/spinner-game/spinner-game.component';
import { HistoryGameComponent } from '../shared/history-game/history-game.component';
import { ChessPiece } from '../interfaces/chess-piece.interface';
import { HeaderGameComponent } from '../shared/header-game/header-game.component';

interface ChessSquare {
  position: string;
  color: 'light' | 'dark';
  piece: ChessPiece | null;
}

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  styleUrls: ['./chess-game.component.css'],
  standalone: true,
  imports: [CommonModule, DragDropModule, ChessPieceComponent, ModalGameComponent, HeaderGameComponent, SpinnerGameComponent, HistoryGameComponent]
})
export class ChessGameComponent implements OnInit {
  private elementRef = inject(ElementRef);
  private chessService = inject(ChessService);

  get board() { return this.chessService.board(); }
  get currentTurn() { return this.chessService.currentTurn(); }
  get gameOver() { return this.chessService.gameOver(); }
  get winnerColor() { return this.chessService.winnerColor(); }
  get showVictoryModal() { return this.chessService.showVictoryModal(); }
  get gameInitialized() { return this.chessService.gameInitialized(); }
  get showInitialAnimations() { return this.chessService.showInitialAnimations(); }
  get isLoading() { return this.chessService.isLoading(); }
  get moveHistory() { return this.chessService.moveHistory(); }
  get totalMovements() { return this.chessService.totalMovements(); }
  get whiteCaptures() { return this.chessService.whiteCaptures(); }
  get blackCaptures() { return this.chessService.blackCaptures(); }

  ngOnInit(): void {
    this.chessService.initializeGame();
  }

  onPieceDrop(event: CdkDragDrop<ChessSquare>): void {
    try {
      if (event.previousContainer === event.container) {
        return;
      }
      const sourceSquare = event.previousContainer.data;
      const targetSquare = event.container.data;
      if (!sourceSquare || !targetSquare) {
        console.error('Error: Datos de casillas no disponibles');
        return;
      }
      const sourcePosition = sourceSquare.position;
      const targetPosition = targetSquare.position;
      const movingPiece = sourceSquare.piece;
      if (!movingPiece) {
        console.error('No hay pieza para mover en la casilla de origen');
        return;
      }
      if (movingPiece.color !== this.currentTurn) {
        console.error('No es el turno de esta pieza');
        return;
      }
      const currentBoard = [...this.board];
      if (this.chessService.isLegalMove(currentBoard, sourcePosition, targetPosition)) {
        const targetPiece = currentBoard[
          8 - parseInt(targetPosition[1])
        ][targetPosition.charCodeAt(0) - 97].piece;
        if (targetPiece) {
          if (targetPiece.color === 'black') {
            this.chessService.whiteCaptures.update(count => count + 1);
          } else {
            this.chessService.blackCaptures.update(count => count + 1);
          }
        }
        document.querySelectorAll('.chess-square-hover').forEach(el => {
          el.classList.remove('chess-square-hover');
        });
        this.chessService.movePiece(currentBoard, sourcePosition, targetPosition);
        this.chessService.totalMovements.update(count => count + 1);
        this.chessService.currentTurn.update(turn => turn === 'white' ? 'black' : 'white');
        this.chessService.board.set([...currentBoard]);
        this.chessService.checkGameStatus();
      } else {
        console.error('Movimiento ilegal');
      }
    } catch (error) {
      console.error('Error al procesar el drop:', error);
    }
  }

  onDragEnded(event: any): void {
    const boardSquares = document.querySelectorAll('.chess-square-container');
    boardSquares.forEach(square => {
      square.classList.remove('possible-drop-target');
      square.classList.remove('chess-square-hover');
    });
    setTimeout(() => {
      const previews = document.querySelectorAll('.cdk-drag-preview');
      previews.forEach(preview => {
        (preview as HTMLElement).remove();
      });
    }, 50);
  }
}
