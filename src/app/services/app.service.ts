import { Injectable, signal, effect, WritableSignal, computed } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PieceColor,
  ChessSquare,
  MoveResult,
  AiMove,
  MoveData,
  AiDifficulty,
  Position,
  ModalData,
  WinnerType
} from '../helpers/interfaces';

import {
  positionToCoordinates,
  getSquareAtPosition,
  getPieceAtPosition,
  deepCloneBoard,
  getAllPiecesForColor,
  findKings,
  generateMoveNotation,
  hasBoardChanged,
  createEmptyBoard,
  INITIAL_PIECE_ORDER,
  placePiece
} from '../helpers/chess-utils';

import {
  isValidPawnMove,
  isValidRookMove,
  isValidKnightMove,
  isValidBishopMove,
  isValidQueenMove,
  isValidKingMove
} from '../helpers/chess-rules';

import { AiService } from './ai.service';

/**
 * AppService: reemplazo modular y ligero de ChessService.
 * - Mantiene estado del juego vía señales.
 * - Delega toda la lógica de IA a `AiService`.
 * - Mantiene las reglas y helpers en el servicio de juego.
 */
@Injectable({ providedIn: 'root' })
export class AppService {
  public board: WritableSignal<ChessSquare[][]> = signal(createEmptyBoard());
  public currentTurn = signal<PieceColor>(PieceColor.White);
  public aiDifficulty = signal<1 | 2 | 3 | 4>(2);
  public aiEnabled = signal<boolean>(true);
  public moveHistory = signal<string[]>([]);
  public totalMovements = signal<number>(0);
  public whiteCaptures = signal<number>(0);
  public blackCaptures = signal<number>(0);
  public showVictoryModal = signal<boolean>(false);
  public showInitialAnimations = signal<boolean>(true);
  public whiteInCheck = signal<boolean>(false);
  public blackInCheck = signal<boolean>(false);
  public winnerColor = signal<PieceColor | null>(null);
  public gameOver = signal<boolean>(false);
  public lastGameScore = signal<number>(0);
  public scoreHistory = signal<any[]>([]);
  public gameInitialized = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  constructor(private aiService: AiService) {
    // animación inicial corta
    setTimeout(() => this.showInitialAnimations.set(false), 1200);
    // efecto: validar estado cuando cambie el tablero
    effect(() => {
      const _ = this.board();
      this.checkGameStatus();
    });

    // persistencia del historial de puntajes
    try {
      const raw = localStorage.getItem(this.SCORE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as import('../helpers/interfaces').ScoreEntry[];
        if (Array.isArray(parsed)) this.scoreHistory.set(parsed);
      }
    } catch (e) { /* ignore */ }

    effect(() => {
      try {
        const h = this.scoreHistory();
        localStorage.setItem(this.SCORE_HISTORY_KEY, JSON.stringify(h));
      } catch (e) { /* ignore */ }
    });

    // detectar cambios prev->next en el tablero y procesar movimientos
    effect(() => {
      const currentBoard = this.board();
      if (!this.gameInitialized() || currentBoard.length === 0) return;
      if (this.previousBoard.length === 0) { this.previousBoard = deepCloneBoard(currentBoard); return; }
      if (hasBoardChanged(this.previousBoard, currentBoard)) {
        this.processMove(this.previousBoard, currentBoard);
        this.previousBoard = deepCloneBoard(currentBoard);
        this.checkGameStatus();
      }
    });

    // programar IA cuando corresponda
    effect(() => {
      if (this.shouldAiMove()) this.scheduleAiMove();
    });
  }

  private SCORE_HISTORY_KEY = 'chess.scoreHistory.v1';
  private previousBoard: ChessSquare[][] = [];
  private aiMoveInProgress = false;

  // ---------------------------
  // Reglas y validaciones
  // ---------------------------
  private isValidMoveByRules(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    const [toRow, toCol] = to;
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) return false;
    const targetPiece = board[toRow][toCol].piece;
    if (targetPiece && targetPiece.color === piece.color) return false;
    switch (piece.type) {
      case PieceType.Pawn: return isValidPawnMove(board, piece, from, to);
      case PieceType.Rook: return isValidRookMove(board, piece, from, to);
      case PieceType.Knight: return isValidKnightMove(board, piece, from, to);
      case PieceType.Bishop: return isValidBishopMove(board, piece, from, to);
      case PieceType.Queen: return isValidQueenMove(board, piece, from, to);
      case PieceType.King: return isValidKingMove(board, piece, from, to);
      default: return false;
    }
  }

  private validateTurn(fromPos: Position): { valid: boolean; error?: string } {
    const piece = getPieceAtPosition(this.board(), fromPos);
    if (!piece) return { valid: false, error: 'No hay pieza en esa posición' };
    if (piece.color !== this.currentTurn()) return { valid: false, error: `Es el turno de las ${this.currentTurn() === PieceColor.White ? 'blancas' : 'negras'}` };
    return { valid: true };
  }

  private isValidMoveComplete(board: ChessSquare[][], fromPos: Position, toPos: Position): boolean {
    const fromCoords = positionToCoordinates(fromPos);
    const toCoords = positionToCoordinates(toPos);
    const piece = getPieceAtPosition(board, fromPos);
    if (!piece) return false;
    return this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col]);
  }

  // Validar movimiento sin ejecutar
  public validateMove(fromPos: Position, toPos: Position): MoveResult {
    return this.validateMoveInternal(fromPos, toPos, false);
  }

  // Interno: validar y opcionalmente ejecutar
  private validateMoveInternal(fromPos: Position, toPos: Position, execute: boolean): MoveResult {
    if (!this.isGameActive()) return { success: false, error: 'Juego no activo' };
    const turnValidation = this.validateTurn(fromPos);
    if (!turnValidation.valid) return { success: false, error: turnValidation.error };
    const board = this.board();
    if (!this.isValidMoveComplete(board, fromPos, toPos)) {
      const piece = getPieceAtPosition(board, fromPos);
      const pieceName = piece ? `${piece.type} ${piece.color}` : 'pieza';
      return { success: false, error: `El ${pieceName} no puede moverse a esa posición` };
    }
    const targetPiece = getPieceAtPosition(board, toPos);
    const moveType = targetPiece ? 'capture' : 'normal';
    if (execute) return this.performMoveWithResult(fromPos, toPos, targetPiece || null);
    return { success: true, captured: targetPiece || undefined, moveType };
  }

  // Ejecutar movimiento (public wrapper que valida y ejecuta)
  public attemptMove(fromPos: Position, toPos: Position): MoveResult {
    return this.validateMoveInternal(fromPos, toPos, true);
  }

  // ---------------------------
  // Movimiento y estado
  // ---------------------------
  public makeMove(fromPos: Position, toPos: Position): MoveResult {
    const turnCheck = this.validateTurn(fromPos);
    if (!turnCheck.valid) return { success: false, error: turnCheck.error };
    const board = this.board();
    if (!this.isValidMoveComplete(board, fromPos, toPos)) return { success: false, error: 'Movimiento inválido' };
    const targetPiece = getPieceAtPosition(board, toPos);
    const result = this.performMoveWithResult(fromPos, toPos, targetPiece || null);
    if (!result.success) return result;
    this.updateGameStateAfterMove({ sourcePos: fromPos, targetPos: toPos, movedPiece: getPieceAtPosition(this.board(), toPos), capturedPiece: result.captured || null });
    if (this.currentTurn() === PieceColor.Black && !this.gameOver()) setTimeout(() => this.makeAiMove(), 250);
    return result;
  }

  private performMoveWithResult(fromPos: Position, toPos: Position, capturedPiece?: ChessPiece | null): MoveResult {
    const board = this.board();
    const newBoard = deepCloneBoard(board);
    const fromSquare = getSquareAtPosition(newBoard, fromPos);
    const toSquare = getSquareAtPosition(newBoard, toPos);
    if (!fromSquare || !toSquare) return { success: false, error: 'Posición inválida' };
    if (!fromSquare.piece) return { success: false, error: 'No hay pieza en origen' };
    const targetPiece = capturedPiece !== undefined ? capturedPiece : toSquare.piece;
    toSquare.piece = { ...fromSquare.piece, position: toPos };
    fromSquare.piece = null;
    this.board.set(newBoard);
    return { success: true, captured: targetPiece || undefined, moveType: targetPiece ? 'capture' : 'normal' };
  }

  private updateGameStateAfterMove(moveData: MoveData): void {
    const { sourcePos, targetPos, movedPiece, capturedPiece } = moveData;
    if (!movedPiece || !sourcePos || !targetPos) return;
    // limpiar cache delegada
    this.aiService.clearCache();
    if (capturedPiece) this.updateCaptures(capturedPiece.color);
    const nextTurn = movedPiece.color === PieceColor.White ? PieceColor.Black : PieceColor.White;
    this.currentTurn.set(nextTurn);
    this.totalMovements.update(v => v + 1);
    const moveNotation = generateMoveNotation(movedPiece, sourcePos, targetPos, capturedPiece);
    this.moveHistory.update(h => [...h, moveNotation]);
  }

  /**
   * Procesa un movimiento detectado y actualiza el estado del juego
   */
  private processMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): void {
    const moveData = this.detectMove(previousBoard, currentBoard);

    if (moveData.movedPiece) {
      this.updateGameStateAfterMove(moveData);
    }
  }

  /**
   * Detecta movimientos comparando tableros de forma optimizada
   */
  private detectMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): MoveData {
    let sourcePos = '';
    let targetPos = '';
    let movedPiece: ChessPiece | null = null;
    let capturedPiece: ChessPiece | null = null;
    let foundSource = false;
    let foundTarget = false;

    for (let row = 0; row < 8 && (!foundSource || !foundTarget); row++) {
      for (let col = 0; col < 8 && (!foundSource || !foundTarget); col++) {
        const prevPiece = previousBoard[row]?.[col]?.piece;
        const currentPiece = currentBoard[row]?.[col]?.piece;

        // Buscar casilla origen (pieza desapareció)
        if (!foundSource && prevPiece && !currentPiece) {
          sourcePos = previousBoard[row][col].position;
          movedPiece = prevPiece;
          foundSource = true;
        }

        // Buscar casilla destino (pieza apareció o cambió)
        if (!foundTarget) {
          if (!prevPiece && currentPiece) {
            targetPos = currentBoard[row][col].position;
            foundTarget = true;
          } else if (prevPiece && currentPiece && prevPiece.id !== currentPiece.id) {
            targetPos = currentBoard[row][col].position;
            capturedPiece = prevPiece;
            foundTarget = true;
          }
        }
      }
    }

    return { sourcePos, targetPos, movedPiece, capturedPiece };
  }

  /**
   * Configura la posición inicial de las piezas en el tablero
   */
  private setupInitialPosition(board: ChessSquare[][]): void {
    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);

      // Piezas blancas
      placePiece(board, `${file}1`, {
        id: col + 1,
        type: INITIAL_PIECE_ORDER[col],
        color: PieceColor.White,
        position: `${file}1`
      });
      placePiece(board, `${file}2`, {
        id: 9 + col,
        type: PieceType.Pawn,
        color: PieceColor.White,
        position: `${file}2`
      });

      // Piezas negras
      placePiece(board, `${file}8`, {
        id: 17 + col,
        type: INITIAL_PIECE_ORDER[col],
        color: PieceColor.Black,
        position: `${file}8`
      });
      placePiece(board, `${file}7`, {
        id: 25 + col,
        type: PieceType.Pawn,
        color: PieceColor.Black,
        position: `${file}7`
      });
    }
  }

  // ---------------------------
  // Score history persistence
  // ---------------------------
  public clearScoreHistory(): void {
    this.scoreHistory.set([]);
    try { localStorage.removeItem(this.SCORE_HISTORY_KEY); } catch (e) { /* ignore */ }
  }

  // ---------------------------
  // Scheduling IA
  // ---------------------------
  private shouldAiMove(): boolean {
    return this.currentTurn() === PieceColor.Black && this.isGameActive() && this.gameInitialized() && this.aiEnabled() && !this.aiMoveInProgress;
  }

  private scheduleAiMove(): void {
    if (this.aiMoveInProgress) return;
    this.aiMoveInProgress = true;
    setTimeout(() => { this.makeAiMove(); this.aiMoveInProgress = false; }, 800);
  }

  // ---------------------------
  // Inicialización y reinicio
  // ---------------------------
  public initializeGame(): void {
    this.resetGameState();
    const newBoard = createEmptyBoard();
    this.setupInitialPosition(newBoard);
    this.board.set(newBoard);
    this.previousBoard = deepCloneBoard(newBoard);
    this.finalizeGameInitialization();
  }

  public resetGame(): void { this.initializeGame(); }

  private resetGameState(): void {
    this.isLoading.set(true);
    this.currentTurn.set(PieceColor.White);
    this.gameOver.set(false);
    this.winnerColor.set(null);
    this.showVictoryModal.set(false);
    this.whiteInCheck.set(false);
    this.blackInCheck.set(false);
    this.moveHistory.set([]);
    this.totalMovements.set(0);
    this.whiteCaptures.set(0);
    this.blackCaptures.set(0);
    this.aiMoveInProgress = false;
    this.previousBoard = [];
    this.lastGameScore.set(0);
  }

  private finalizeGameInitialization(): void {
    this.isLoading.set(false);
    this.gameInitialized.set(true);
    this.showInitialAnimations.set(true);
    setTimeout(() => this.showInitialAnimations.set(false), 2000);
  }

  // ---------------------------
  // Computed helpers para UI
  // ---------------------------
  public readonly victoryModalData = computed((): ModalData => {
    if (!this.showVictoryModal() || !this.gameOver()) {
      return { open: false, title: '', content: '' } as ModalData;
    }

    const winner = this.winnerColor();
    const score = this.lastGameScore();
    let content = 'Partida en tablas';

    if (winner === PieceColor.White) {
      content = `¡Ganan las blancas! Puntaje: ${score}`;
    } else if (winner === PieceColor.Black) {
      content = `¡Ganan las negras! Puntaje: ${score}`;
    }

    return {
      open: true,
      title: '🏆 ¡Partida finalizada!',
      content,
      score
    } as ModalData;
  });

  public readonly isGameActive = computed(() => this.gameInitialized() && !this.gameOver());


  private updateCaptures(capturedColor: PieceColor): void {
    if (capturedColor === PieceColor.White) this.whiteCaptures.update(v => v + 1);
    else this.blackCaptures.update(v => v + 1);
  }

  // ---------------------------
  // Delegación IA
  // ---------------------------
  private makeAiMove(): void {
    const board = this.board();
    const difficulty = this.aiDifficulty();
    const bestMove = this.aiService.findBestMove(board, difficulty);
    if (bestMove) this.makeMove(bestMove.from, bestMove.to);
  }

  public getValidMovesForPiece(board: ChessSquare[][], position: Position): Position[] {
    return this.aiService.getValidMovesForPieceWithRules(board, position);
  }

  public setAiDifficulty(level: AiDifficulty): void {
    let val: 1 | 2 | 3 | 4 = 2;
    if (typeof level === 'number') val = Math.max(1, Math.min(4, Math.floor(level))) as 1 | 2 | 3 | 4;
    else { if (level === 'easy') val = 1; else if (level === 'medium') val = 2; else if (level === 'hard') val = 3; else if (level === 'very-hard') val = 4; }
    this.aiDifficulty.set(val);
    this.aiService.clearCache();
  }

  private checkGameStatus(): void {
    const currentBoard = this.board();
    const kingsExist = findKings(currentBoard);
  if (!kingsExist.white) { this.endGame(PieceColor.Black); return; }
  if (!kingsExist.black) { this.endGame(PieceColor.White); return; }
    const whiteKingPos = this.findKingPosition(currentBoard, PieceColor.White);
    const blackKingPos = this.findKingPosition(currentBoard, PieceColor.Black);
    let whiteInCheck = false; let blackInCheck = false;
    if (whiteKingPos) {
      const opponents = getAllPiecesForColor(currentBoard, PieceColor.Black);
      for (const p of opponents) { const moves = this.aiService.getValidMovesForPieceWithRules(currentBoard, p); if (moves.includes(whiteKingPos)) { whiteInCheck = true; break; } }
    }
    if (blackKingPos) {
      const opponents = getAllPiecesForColor(currentBoard, PieceColor.White);
      for (const p of opponents) { const moves = this.aiService.getValidMovesForPieceWithRules(currentBoard, p); if (moves.includes(blackKingPos)) { blackInCheck = true; break; } }
    }
    this.whiteInCheck.set(whiteInCheck); this.blackInCheck.set(blackInCheck);
  }

  private findKingPosition(board: ChessSquare[][], color: PieceColor): Position | null {
    for (const row of board) for (const sq of row) if (sq.piece && sq.piece.type === PieceType.King && sq.piece.color === color) return sq.position;
    return null;
  }

  private endGame(winner: PieceColor): void {
    this.gameOver.set(true);
    this.winnerColor.set(winner);
    try {
      const score = this.computeScore(winner);
      this.lastGameScore.set(score);
      const entry: import('../helpers/interfaces').ScoreEntry = {
        score,
        winner: winner as import('../helpers/interfaces').WinnerType,
        moves: this.totalMovements(),
        difficulty: this.normalizeDifficulty(),
        date: new Date().toISOString()
      };
      this.scoreHistory.update(h => [entry, ...h].slice(0, 50));
    } catch (e) {
      this.lastGameScore.set(0);
    }
    setTimeout(() => this.showVictoryModal.set(true), 100);
  }

  private computeScore(winner: PieceColor): number {
    const base = 100;
    const difficulty = this.aiDifficulty();
  const diff = this.normalizeDifficulty();
  const difficultyMultiplier = diff === 1 ? 1 : diff === 2 ? 1.5 : diff === 3 ? 2 : 2.5;
    const moves = this.totalMovements() || 0;
    const efficiency = Math.max(0.2, (20 - moves) / 20);
    const winnerCaptures = winner === PieceColor.White ? this.whiteCaptures() : this.blackCaptures();
    const captureBonus = Math.min(10, winnerCaptures * 5);
    const checkBonus = (winner === PieceColor.White ? this.blackInCheck() : this.whiteInCheck()) ? 5 : 0;
    const raw = base * difficultyMultiplier * (0.5 + efficiency) + captureBonus + checkBonus;
    return Math.max(0, Math.round(raw));
  }

  private normalizeDifficulty(): 1 | 2 | 3 | 4 {
    const d = this.aiDifficulty();
    if (typeof d === 'number') return (Math.max(1, Math.min(4, Math.floor(d))) as 1 | 2 | 3 | 4);
    if (d === 'easy') return 1;
    if (d === 'medium') return 2;
    if (d === 'hard') return 3;
    return 4;
  }
}
