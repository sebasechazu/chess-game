import { Component, inject } from '@angular/core';
import { ChessService } from '../services/chess.service';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from './chess-board/chess-board.component';
import { ModalGameComponent } from '../shared/modal-game/modal-game.component';
import { SpinnerGameComponent } from '../shared/spinner-game/spinner-game.component';
import { HistoryGameComponent } from '../shared/history-game/history-game.component';
import { HeaderGameComponent } from '../shared/header-game/header-game.component';

/**
 * Componente principal del juego de ajedrez
 * Coordina la interacción entre el servicio de lógica y los componentes de UI
 */
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
  
  /** Tablero de ajedrez reactivo */
  board = this.chessService.board;
  /** Turno actual del juego */
  currentTurn = this.chessService.currentTurn;
  /** Estado de finalización del juego */
  gameOver = this.chessService.gameOver;

  constructor() {
    this.chessService.initializeGame();
  }

  onChangeDifficulty(level: 'easy' | 'medium' | 'hard' | number): void {
    this.chessService.setAiDifficulty(level);
  }

  /**
   * Reinicia el juego a su estado inicial
   */
  onReset(): void {
    this.chessService.resetGame();
  }

  /**
   * Activa o desactiva la inteligencia artificial
   * @param enabled - true para activar IA, false para desactivar
   */
  onToggleAi(enabled: boolean): void {
    this.chessService.aiEnabled.set(enabled);
  }

  /**
   * Procesa un intento de movimiento desde el tablero
   * @param moveData - Datos del movimiento con posiciones origen y destino
   */
  onMoveAttempt(moveData: { from: string; to: string }): void {
    this.chessService.makeMove(moveData.from, moveData.to);
  }

  /**
   * Valida un movimiento sin ejecutarlo (para feedback visual)
   * @param from - Posición origen
   * @param to - Posición destino
   * @returns Resultado de la validación
   */
  validateMove(from: string, to: string) {
    return this.chessService.validateMove(from, to);
  }

}
