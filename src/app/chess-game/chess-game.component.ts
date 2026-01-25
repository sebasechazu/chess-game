import { Component, inject } from '@angular/core';
import { AppService } from '../services/app.service';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from './chess-board/chess-board.component';
import { ModalGameComponent } from '../shared/modal-game/modal-game.component';
import { HistoryGameComponent } from '../shared/history-game/history-game.component';
import { HeaderGameComponent } from '../shared/header-game/header-game.component';

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    ModalGameComponent,
    HeaderGameComponent,
    HistoryGameComponent
  ]
})
export class ChessGameComponent {

  readonly chessService = inject(AppService);
  board = this.chessService.board;
  currentTurn = this.chessService.currentTurn;
  gameOver = this.chessService.gameOver;

  constructor() {
    this.chessService.initializeGame();
  }

  onReset(): void {
    this.chessService.resetGame();
  }

  onMoveAttempt(moveData: { from: string; to: string }): void {
    this.chessService.makeMove(moveData.from, moveData.to);
  }

  validateMove(from: string, to: string) {
    return this.chessService.validateMove(from, to);
  }

  onConfirmCheckmate(): void {
    const modal = this.chessService.checkmateConfirmModal();
    if (modal.onConfirm) {
      modal.onConfirm();
    }
  }

  onCancelCheckmate(): void {
    const modal = this.chessService.checkmateConfirmModal();
    if (modal.onCancel) {
      modal.onCancel();
    }
  }

}
