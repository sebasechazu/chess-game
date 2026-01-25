import { Injectable, signal, effect, WritableSignal, computed } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PieceColor,
  ChessSquare,
  MoveResult,
  AiMove,
  MoveData,
  Position,
  ModalData,
  WinnerType,
  ScoreEntry
} from '../helpers/interfaces';

import {
  positionToCoordinates,
  getSquareAtPosition,
  getPieceAtPosition,
  deepCloneBoard,
  getAllPiecesForColor,
  findKings,
  generateMoveNotation,
  generateIntuitiveMoveNotation,
  hasBoardChanged,
  createEmptyBoard,
  INITIAL_PIECE_ORDER,
  placePiece
} from '../helpers/chess-utils';

import { isValidMove } from '../helpers/chess-basic-validation';
import { isKingInCheck, isCheckmate, isStalemate, isLegalMove, wouldCauseCheckmate } from '../helpers/chess-advanced-rules';

import { AiService, AiMoveResult } from './ai.service';

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
  // Dificultad eliminada: IA siempre juega a nivel fijo
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
  public scoreHistory = signal<ScoreEntry[]>([]);
  public gameInitialized = signal<boolean>(false);
  public isDarkMode = signal<boolean>(false);
  public checkmateWarning = signal<{show: boolean, message: string}>({show: false, message: ''});
  public checkmateConfirmModal = signal<{
    show: boolean, 
    fromPos: string, 
    toPos: string, 
    onConfirm: (() => void) | null,
    onCancel: (() => void) | null
  }>({
    show: false, 
    fromPos: '', 
    toPos: '', 
    onConfirm: null,
    onCancel: null
  });

  // Constantes de configuración
  private readonly INITIAL_ANIMATION_DURATION = 1200;
  private readonly AI_MOVE_DELAY = 800;
  private readonly FINAL_ANIMATION_DURATION = 2000;
  private readonly MAX_SCORE_HISTORY = 50;
  private readonly VICTORY_MODAL_DELAY = 100;
  private readonly DRAW_SCORE = 50;
  private readonly SCORE_HISTORY_KEY = 'chess.scoreHistory.v1';
  private readonly THEME_KEY = 'chess.theme.v1';
  private readonly BOARD_SIZE = 8;
  private readonly ASCII_LOWERCASE_A = 97;

  constructor(private aiService: AiService) {
    setTimeout(() => this.showInitialAnimations.set(false), this.INITIAL_ANIMATION_DURATION);
    
    // Inicializar tema desde localStorage
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
    }

    effect(() => {
      const _ = this.board();
      this.checkGameStatus();
    });

    effect(() => {
      const dark = this.isDarkMode();
      localStorage.setItem(this.THEME_KEY, dark ? 'dark' : 'light');
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    try {
      const raw = localStorage.getItem(this.SCORE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScoreEntry[];
        if (Array.isArray(parsed)) this.scoreHistory.set(parsed);
      }
    } catch (e) {
      console.error('Error al cargar el historial de puntajes:', e);
    }

    /**
     * Guardar historial de puntajes en localStorage al cambiar
     */
    effect(() => {
      try {
        const h = this.scoreHistory();
        localStorage.setItem(this.SCORE_HISTORY_KEY, JSON.stringify(h));
      } catch (e) {
        console.error('Error al guardar el historial de puntajes:', e);
      }
    });

    /**
     * Detectar cambios en el tablero y procesar movimientos
     */
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
      if (this.shouldAiMove()) {
        this.scheduleAiMove();
      }
    });
  }

  private previousBoard: ChessSquare[][] = [];
  private aiMoveInProgress = false;

  /**
   * Valida si un movimiento es legal según las reglas del ajedrez
   * @param board - Estado actual del tablero
   * @param piece - Pieza que se mueve
   * @param from - Coordenadas origen [fila, columna]
   * @param to - Coordenadas destino [fila, columna]
   * @returns true si el movimiento es válido según las reglas, false en caso contrario
   */
  private isValidMoveByRules(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    // Usar la función consolidada de validación
    return isValidMove(board, piece, from, to);
  }

  /**
   * Valida el turno del jugador actual
   * @param fromPos - posición origen (e.g. 'e2')
   * @returns un objeto con la validez del turno y un mensaje de error opcional
   */
  private validateTurn(fromPos: Position): { valid: boolean; error?: string } {
    const piece = getPieceAtPosition(this.board(), fromPos);
    if (!piece) return { valid: false, error: 'No hay pieza en esa posición' };
    if (piece.color !== this.currentTurn()) return { valid: false, error: `Es el turno de las ${this.currentTurn() === PieceColor.White ? 'blancas' : 'negras'}` };
    return { valid: true };
  }

  /***
   * Valida un movimiento completo (reglas + turno)
   * @param board - Estado actual del tablero
   * @param fromPos - posición origen (e.g. 'e2')
   * @param toPos - posición destino (e.g. 'e4')
   * @returns true si el movimiento es válido, false en caso contrario
   */
  private isValidMoveComplete(board: ChessSquare[][], fromPos: Position, toPos: Position): boolean {
    const fromCoords = positionToCoordinates(fromPos);
    const toCoords = positionToCoordinates(toPos);
    const piece = getPieceAtPosition(board, fromPos);
    if (!piece) return false;
    return this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col]);
  }


  /**
   * Valida un movimiento sin ejecutarlo
   * @param fromPos - posición origen (e.g. 'e2')
   * @param toPos - posición destino (e.g. 'e4')
   * @returns un objeto con la validez del movimiento y un mensaje de error opcional
   */
  public validateMove(fromPos: Position, toPos: Position): MoveResult {
    return this.validateMoveInternal(fromPos, toPos, false);
  }

  /**
   * Valida un movimiento (reglas + turno) y opcionalmente lo ejecuta
   * @param fromPos - posición origen (e.g. 'e2')
   * @param toPos - posición destino (e.g. 'e4')
   * @param execute - si se debe ejecutar el movimiento
   * @returns un objeto con la validez del movimiento y un mensaje de error opcional
   */
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

  /**
   * Realiza un movimiento en el tablero
   * @param fromPos - posición origen (e.g. 'e2')
   * @param toPos - posición destino (e.g. 'e4')
   * @returns un objeto con el resultado del movimiento
   */
  public makeMove(fromPos: Position, toPos: Position): MoveResult {
    const piece = getPieceAtPosition(this.board(), fromPos);
    console.log('Making move:', fromPos, 'to', toPos, 'piece:', piece);
    
    // Solo verificar movimientos peligrosos para las blancas (jugador)
    if (piece && piece.color === PieceColor.White) {
      console.log('Checking white piece move for danger...');
      // Simular el movimiento de las blancas
      const simulatedBoard = this.simulatePlayerMove(fromPos, toPos);
      if (!simulatedBoard) {
        return { success: false, error: 'Movimiento inválido' };
      }
      
      // Verificar si después de este movimiento, las negras pueden hacer jaque mate
      const canCheckmate = this.canBlackMakeCheckmate(simulatedBoard);
      console.log('Can black make checkmate after this move?', canCheckmate);
      
      if (canCheckmate) {
        console.log('DANGEROUS MOVE DETECTED! Showing confirmation modal...');
        // Mostrar modal de confirmación para advertir al jugador
        this.checkmateConfirmModal.set({
          show: true,
          fromPos,
          toPos,
          onConfirm: () => {
            this.checkmateConfirmModal.set({show: false, fromPos: '', toPos: '', onConfirm: null, onCancel: null});
            // Ejecutar el movimiento después de la confirmación
            this.executeMove(fromPos, toPos);
          },
          onCancel: () => {
            this.checkmateConfirmModal.set({show: false, fromPos: '', toPos: '', onConfirm: null, onCancel: null});
            // No hacer nada, el movimiento no se ejecuta
          }
        });
        
        return { success: false, error: 'Esperando confirmación - movimiento peligroso' };
      }
    }

    // Para las negras (IA) o si no hay problemas, ejecutar el movimiento normalmente
    return this.executeMove(fromPos, toPos);
  }

  /**
   * Método específico para movimientos de la IA - sin verificaciones de confirmación
   * @param fromPos - posición origen
   * @param toPos - posición destino
   * @returns resultado del movimiento
   */
  public executeAiMove(fromPos: Position, toPos: Position): MoveResult {
    return this.executeMove(fromPos, toPos);
  }

  /**
   * Simula un movimiento del jugador y devuelve el tablero resultante
   */
  private simulatePlayerMove(fromPos: Position, toPos: Position): ChessSquare[][] | null {
    const validation = this.validateMoveInternal(fromPos, toPos, false);
    if (!validation.success) {
      return null;
    }

    const board = deepCloneBoard(this.board());
    const fromCoords = positionToCoordinates(fromPos);
    const toCoords = positionToCoordinates(toPos);
    const piece = board[fromCoords.row][fromCoords.col].piece;
    
    if (!piece) return null;

    // Realizar el movimiento en el tablero simulado
    board[toCoords.row][toCoords.col].piece = piece;
    board[fromCoords.row][fromCoords.col].piece = null;
    
    return board;
  }

  /**
   * Verifica si las negras pueden hacer jaque mate en el tablero dado
   */
  private canBlackMakeCheckmate(board: ChessSquare[][]): boolean {
    // Buscar todas las piezas negras
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col].piece;
        if (piece && piece.color === PieceColor.Black) {
          // Para cada pieza negra, verificar todos sus movimientos posibles
          for (let targetRow = 0; targetRow < 8; targetRow++) {
            for (let targetCol = 0; targetCol < 8; targetCol++) {
              if (isValidMove(board, piece, [row, col], [targetRow, targetCol])) {
                // Verificar si este movimiento causa jaque mate
                if (wouldCauseCheckmate(board, piece, [row, col], [targetRow, targetCol])) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Ejecuta un movimiento sin verificaciones adicionales
   * @param fromPos - posición origen
   * @param toPos - posición destino
   * @returns resultado del movimiento
   */
  private executeMove(fromPos: Position, toPos: Position): MoveResult {
    return this.validateMoveInternal(fromPos, toPos, true);
  }

  /**
   * Realiza un movimiento en el tablero
   * @param fromPos - posición origen (e.g. 'e2')
   * @param toPos - posición destino (e.g. 'e4')
   * @param capturedPiece - pieza capturada (si la hay)
   * @returns un objeto con el resultado del movimiento
   */
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

  /**
   * Actualiza el estado del juego después de un movimiento
   * @param moveData - datos del movimiento realizado
   * @returns void
   */
  private updateGameStateAfterMove(moveData: MoveData): void {
    const { sourcePos, targetPos, movedPiece, capturedPiece } = moveData;
    if (!movedPiece || !sourcePos || !targetPos) return;
    // limpiar cache delegada
    this.aiService.clearCache();
    if (capturedPiece) this.updateCaptures(capturedPiece.color);
    const nextTurn = movedPiece.color === PieceColor.White ? PieceColor.Black : PieceColor.White;
    this.currentTurn.set(nextTurn);
    this.totalMovements.update(v => v + 1);
    const moveNotation = generateIntuitiveMoveNotation(movedPiece, sourcePos, targetPos, capturedPiece);
    this.moveHistory.update(h => [...h, moveNotation]);
  }

  /**
   * Procesa un movimiento detectado y actualiza el estado del juego
   * @param previousBoard - estado del tablero antes del movimiento
   * @param currentBoard - estado del tablero después del movimiento
   * @return void
   */
  private processMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): void {
    const moveData = this.detectMove(previousBoard, currentBoard);

    if (moveData.movedPiece) {
      this.updateGameStateAfterMove(moveData);
    }
  }

  /**
   * Detecta movimientos comparando tableros de forma optimizada
   * @param previousBoard - estado del tablero antes del movimiento
   * @param currentBoard - estado del tablero después del movimiento
   * @return MoveData - datos del movimiento detectado
   */
  private detectMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): MoveData {
    let sourcePos = '';
    let targetPos = '';
    let movedPiece: ChessPiece | null = null;
    let capturedPiece: ChessPiece | null = null;
    let foundSource = false;
    let foundTarget = false;

    for (let row = 0; row < this.BOARD_SIZE && (!foundSource || !foundTarget); row++) {
      for (let col = 0; col < this.BOARD_SIZE && (!foundSource || !foundTarget); col++) {
        const prevPiece = previousBoard[row]?.[col]?.piece;
        const currentPiece = currentBoard[row]?.[col]?.piece;

        if (!foundSource && prevPiece && !currentPiece) {
          sourcePos = previousBoard[row][col].position;
          movedPiece = prevPiece;
          foundSource = true;
        }
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
   * @param board - tablero vacío a configurar
   * @return void
   */
  private setupInitialPosition(board: ChessSquare[][]): void {
    for (let col = 0; col < this.BOARD_SIZE; col++) {
      const file = String.fromCharCode(this.ASCII_LOWERCASE_A + col);

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

  /**
   * Limpia el historial de puntajes
   * @return void
   */
  public clearScoreHistory(): void {
    this.scoreHistory.set([]);
    try { localStorage.removeItem(this.SCORE_HISTORY_KEY); } catch (e) { /* ignore */ }
  }

  /**
   * Determina si la IA debe mover en este turno
   * @returns boolean - si la IA debe mover en este turno
   */
  private shouldAiMove(): boolean {
    return this.currentTurn() === PieceColor.Black && this.isGameActive() && this.gameInitialized() && this.aiEnabled() && !this.aiMoveInProgress;
  }

  /**
   * Programa el movimiento de la IA con un retraso
   * @returns void
   */
  private scheduleAiMove(): void {
    if (this.aiMoveInProgress) return;
    this.aiMoveInProgress = true;
    setTimeout(async () => {
      try {
        await this.makeAiMove();
      } catch (error) {
        // Silenciar error de movimiento de IA
      } finally {
        this.aiMoveInProgress = false;
      }
    }, this.AI_MOVE_DELAY);
  }


  /**
   * Inicializa una nueva partida de ajedrez
   * Resetea el estado y configura la posición inicial
   * @returns void
   */
  public initializeGame(): void {
    this.resetGameState();
    const newBoard = createEmptyBoard();
    this.setupInitialPosition(newBoard);
    this.board.set(newBoard);
    this.previousBoard = deepCloneBoard(newBoard);
    this.finalizeGameInitialization();
  }

  /**
   * Reinicia la partida actual
   * Resetea el estado y configura la posición inicial
   * @returns void
   */
  public resetGame(): void { this.initializeGame(); }

  /**
   * Resetea el estado del juego a valores iniciales
   * @returns void
   */
  private resetGameState(): void {
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

  /**
   * Finaliza la inicialización del juego mostrando animaciones iniciales
   * @returns void
   */
  private finalizeGameInitialization(): void {
    this.gameInitialized.set(true);
    this.showInitialAnimations.set(true);
    setTimeout(() => this.showInitialAnimations.set(false), this.FINAL_ANIMATION_DURATION);
  }

  /**
   * Computed helpers para UI
   * @returns void
   */
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

  /**
   * Indica si el juego está activo (iniciado y no terminado)
   * @returns boolean - si el juego está activo
   */
  public readonly isGameActive = computed(() => this.gameInitialized() && !this.gameOver());

  /**
   * Estado de procesamiento de la IA (delegado al AiService)
   * @returns boolean - si la IA está pensando
   */
  public readonly isAiThinking = computed(() => this.aiService.isProcessing());

  /**
   * Actualiza el conteo de piezas capturadas
   * @param capturedColor - color de la pieza capturada
   */
  private updateCaptures(capturedColor: PieceColor): void {
    if (capturedColor === PieceColor.White) this.whiteCaptures.update(v => v + 1);
    else this.blackCaptures.update(v => v + 1);
  }

  /**
   * Realiza el movimiento de la IA consultando al AiService
   * @returns void
   */
  private async makeAiMove(): Promise<void> {
    const board = this.board();
    try {
      const aiResult: AiMoveResult = await this.aiService.findBestMove(board);
      if (aiResult.move) {
        const result = this.executeAiMove(aiResult.move.from, aiResult.move.to);
      } else {
        console.warn('No hay movimientos disponibles para la IA');
      }
    } catch (error) {
      console.error('Error al calcular movimiento de IA:', error);
    }
  }

  /**
   * Obtiene los movimientos válidos para una pieza en el tablero
   * @param board - El estado actual del tablero
   * @param position - La posición de la pieza
   * @returns Un array con las posiciones válidas a las que puede moverse la pieza
   */
  public getValidMovesForPiece(board: ChessSquare[][], position: Position): Position[] {
    return this.getValidMovesForPieceWithRules(board, position);
  }

  /**
   * Obtiene los movimientos válidos para una pieza en el tablero
   * @param board - El estado actual del tablero
   * @param position - La posición de la pieza
   * @returns Un array con las posiciones válidas a las que puede moverse la pieza
   */
  private getValidMovesForPieceWithRules(board: ChessSquare[][], position: Position): Position[] {
    const validMoves: Position[] = [];
    const piece = getPieceAtPosition(board, position);
    if (!piece) return validMoves;

    const fromCoords = positionToCoordinates(position);

    for (const row of board) {
      for (const square of row) {
        if (position === square.position) continue;
        const toCoords = positionToCoordinates(square.position);
        if (this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col])) {
          validMoves.push(square.position);
        }
      }
    }

    return validMoves;
  }

  /**
   * 
   * Verifica el estado del juego: jaque, jaque mate, tablas
   * Actualiza las señales correspondientes y finaliza el juego si es necesario
   * @returns void
   */
  private checkGameStatus(): void {
    const currentBoard = this.board();
    const kingsExist = findKings(currentBoard);
    if (!kingsExist.white) { this.endGame(PieceColor.Black); return; }
    if (!kingsExist.black) { this.endGame(PieceColor.White); return; }

    const whiteInCheck = isKingInCheck(currentBoard, PieceColor.White);
    const blackInCheck = isKingInCheck(currentBoard, PieceColor.Black);

    this.whiteInCheck.set(whiteInCheck);
    this.blackInCheck.set(blackInCheck);

    // Verificar jaque mate o empate
    if (whiteInCheck && isCheckmate(currentBoard, PieceColor.White)) {
      this.endGame(PieceColor.Black);
    } else if (blackInCheck && isCheckmate(currentBoard, PieceColor.Black)) {
      this.endGame(PieceColor.White);
    } else if (isStalemate(currentBoard, this.currentTurn())) {
      this.endGame(null); // Empate
    }
  }

  /**
   * Obtiene la posición del rey de un color específico en el tablero
   * @param board - El estado actual del tablero
   * @param color - El color del rey a buscar
   * @returns La posición del rey o null si no se encuentra
   */
  private findKingPosition(board: ChessSquare[][], color: PieceColor): Position | null {
    for (const row of board) for (const sq of row) if (sq.piece && sq.piece.type === PieceType.King && sq.piece.color === color) return sq.position;
    return null;
  }

  /**
   * Finaliza el juego, actualiza el estado y muestra el modal de victoria
   * @param winner - color del ganador o null en caso de empate
   * @returns void
   */
  private endGame(winner: PieceColor | null): void {
    this.gameOver.set(true);
    this.winnerColor.set(winner);
    try {
      const score = winner ? this.computeScore(winner) : this.DRAW_SCORE; // Empate = 50 puntos
      this.lastGameScore.set(score);
      const entry: ScoreEntry = {
        score,
        winner: winner as WinnerType,
        moves: this.totalMovements(),
        // dificultad eliminada
        date: new Date().toISOString()
      };
      this.scoreHistory.update(h => [entry, ...h].slice(0, this.MAX_SCORE_HISTORY));
    } catch (e) {
      this.lastGameScore.set(0);
    }
    setTimeout(() => this.showVictoryModal.set(true), this.VICTORY_MODAL_DELAY);
  }

  /**
   * Calcula la puntuación del jugador ganador
   * @param winner - color del ganador
   * @returns La puntuación calculada
   */
  private computeScore(winner: PieceColor): number {
    const base = 100;
    const difficultyMultiplier = 2.5;
    const moves = this.totalMovements() || 0;
    const efficiency = Math.max(0.2, (20 - moves) / 20);
    const winnerCaptures = winner === PieceColor.White ? this.whiteCaptures() : this.blackCaptures();
    const captureBonus = Math.min(10, winnerCaptures * 5);
    const checkBonus = (winner === PieceColor.White ? this.blackInCheck() : this.whiteInCheck()) ? 5 : 0;
    const raw = base * difficultyMultiplier * (0.5 + efficiency) + captureBonus + checkBonus;
    return Math.max(0, Math.round(raw));
  }

}
