import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppService } from '../../core/services/app.service';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from './chess-board/chess-board.component';
import { ModalGameComponent } from '../../shared/modal-game/modal-game.component';
import { HeaderGameComponent } from '../../shared/header-game/header-game.component';
import { HistoryGameComponent } from '../../components/history-game/history-game.component';

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ChessBoardComponent,
    ModalGameComponent,
    HeaderGameComponent,
    HistoryGameComponent
  ]
})
export class ChessGameComponent implements OnInit {

  readonly chessService = inject(AppService);
  board = this.chessService.board;
  currentTurn = this.chessService.currentTurn;
  gameOver = this.chessService.gameOver;
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      if (mode === 'pvp') {
        this.chessService.aiEnabled.set(false);
      } else {
        this.chessService.aiEnabled.set(true);
      }
      // Re-initialize game when mode changes
      this.chessService.initializeGame();
    });
  }

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
