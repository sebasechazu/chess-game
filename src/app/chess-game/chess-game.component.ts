import { Component, inject, input, signal } from '@angular/core';
import { ChessService } from '../services/chess.service';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from './chess-board/chess-board.component';
import { ModalGameComponent } from '../shared/modal-game/modal-game.component';
import { SpinnerGameComponent } from '../shared/spinner-game/spinner-game.component';
import { HistoryGameComponent } from '../shared/history-game/history-game.component';
import { HeaderGameComponent } from '../shared/header-game/header-game.component';

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  imports: [
    CommonModule,
    ChessBoardComponent,
    ModalGameComponent,
    HeaderGameComponent,
    SpinnerGameComponent,
    HistoryGameComponent
  ]
})
export class ChessGameComponent {

  readonly chessService = inject(ChessService);
  // Usar los signals del servicio directamente
  board = this.chessService.board;
  currentTurn = this.chessService.currentTurn;
  gameOver = this.chessService.gameOver;

  constructor() {
    this.chessService.initializeGame();
  }

  onReset(): void {
    this.chessService.resetGame();
  }

  onToggleAi(enabled: boolean): void {
    this.chessService.aiEnabled.set(enabled);
  }

  onMoveAttempt(moveData: { from: string; to: string }): void {
    this.chessService.executeMove(moveData.from, moveData.to);
  }

}
