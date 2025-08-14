
import { Injectable, signal, computed, WritableSignal, effect } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PieceColor,
  ChessSquare,
  MoveResult,
  AiMove,
  MoveData,
  ModalData,
  WinnerType,
  Position,
  Coordinates
} from '../helpers/interfaces';
import {
  isValidPawnMove,
  isValidRookMove,
  isValidKnightMove,
  isValidBishopMove,
  isValidQueenMove,
  isValidKingMove
} from '../helpers/chess-rules';
import {
  positionToCoordinates,
  getSquareAtPosition,
  getPieceAtPosition,
  placePiece,
  deepCloneBoard,
  hasBoardChanged,
  getAllPiecesForColor,
  findKings,
  generateMoveNotation,
  getCenterPositionBonus,
  getPieceValue,
  createEmptyBoard,
  INITIAL_PIECE_ORDER
} from '../helpers/chess-utils';

/**
 * Servicio principal del juego de ajedrez
 * Maneja toda la lógica de negocio, validaciones, estado del juego e IA
 */
@Injectable({ providedIn: 'root' })
export class ChessService {

  /**
   * Estado del tablero
   */
  public readonly board: WritableSignal<ChessSquare[][]> = signal<ChessSquare[][]>([]);
  public readonly currentTurn: WritableSignal<PieceColor> = signal<PieceColor>(PieceColor.White);
  public readonly gameOver: WritableSignal<boolean> = signal<boolean>(false);
  public readonly whiteInCheck: WritableSignal<boolean> = signal<boolean>(false);
  public readonly blackInCheck: WritableSignal<boolean> = signal<boolean>(false);
  public readonly winnerColor: WritableSignal<WinnerType> = signal<WinnerType>(null);
  public readonly showVictoryModal: WritableSignal<boolean> = signal<boolean>(false);
  public readonly gameInitialized: WritableSignal<boolean> = signal<boolean>(false);
  public readonly showInitialAnimations: WritableSignal<boolean> = signal<boolean>(false);
  public readonly isLoading: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Historial de movimientos realizados
   */
  public readonly moveHistory: WritableSignal<string[]> = signal<string[]>([]);
  public readonly totalMovements: WritableSignal<number> = signal<number>(0);
  public readonly whiteCaptures: WritableSignal<number> = signal<number>(0);
  public readonly blackCaptures: WritableSignal<number> = signal<number>(0);
  public readonly aiEnabled: WritableSignal<boolean> = signal<boolean>(true);
  // Dificultad de la IA: 1 = easy, 2 = medium, 3 = hard
  public readonly aiDifficulty: WritableSignal<number> = signal<number>(2);

  /** 
   * Datos reactivos para el modal de victoria 
   */
  public readonly victoryModalData = computed((): ModalData => {
    if (!this.showVictoryModal() || !this.gameOver()) {
      return { open: false, title: '', content: '' };
    }

    const winner = this.winnerColor();
    let content = 'Partida en tablas';

    if (winner === PieceColor.White) {
      content = '¡Ganan las blancas!';
    } else if (winner === PieceColor.Black) {
      content = '¡Ganan las negras!';
    }

    return {
      open: true,
      title: '🏆 ¡Partida finalizada!',
      content
    };
  });

  /**
   * Indica si el juego está activo y se pueden hacer movimientos
   */
  public readonly isGameActive = computed(() =>
    this.gameInitialized() && !this.gameOver()
  );

  /**
   * Estado del tablero anterior
   */
  private previousBoard: ChessSquare[][] = [];
  private aiMoveInProgress = false;
  private aiMovesCache = new Map<string, Position[]>();

  constructor() {

    effect(() => {
      const currentBoard = this.board();
      if (!this.gameInitialized() || currentBoard.length === 0) return;

      if (this.previousBoard.length === 0) {
        this.previousBoard = deepCloneBoard(currentBoard);
        return;
      }

      if (hasBoardChanged(this.previousBoard, currentBoard)) {
        this.processMove(this.previousBoard, currentBoard);
        this.previousBoard = deepCloneBoard(currentBoard);
        this.checkGameStatus();
      }
    });

    effect(() => {
      if (this.shouldAiMove()) {
        this.scheduleAiMove();
      }
    });
  }

  /**
   * Inicializa un nuevo juego de ajedrez
   */
  initializeGame(): void {
    this.resetGameState();
    const newBoard = createEmptyBoard();
    this.setupInitialPosition(newBoard);
    this.board.set(newBoard);
    this.previousBoard = deepCloneBoard(newBoard);
    this.finalizeGameInitialization();
  }

  /**
   * Reinicia el juego actual
   */
  resetGame(): void {
    this.initializeGame();
  }

  /**
   * Ejecuta un movimiento en el tablero
   * @param fromPos - Posición origen (ej: "e2")
   * @param toPos - Posición destino (ej: "e4")
   * @returns Resultado del movimiento con información detallada
   */
  public makeMove(fromPos: Position, toPos: Position): MoveResult {
    return this.attemptMove(fromPos, toPos);
  }

  /**
   * Valida un movimiento sin ejecutarlo
   * @param fromPos - Posición origen
   * @param toPos - Posición destino
   * @returns Resultado de la validación
   */
  public validateMove(fromPos: Position, toPos: Position): MoveResult {
    return this.validateMoveInternal(fromPos, toPos, false);
  }

  /**
   * Ejecuta un movimiento después de validarlo
   * @param fromPos - Posición origen
   * @param toPos - Posición destino
   * @returns Resultado del movimiento
   */
  private attemptMove(fromPos: Position, toPos: Position): MoveResult {
    return this.validateMoveInternal(fromPos, toPos, true);
  }

  /**
   * Lógica interna para validar y opcionalmente ejecutar un movimiento
   * @param fromPos - Posición origen
   * @param toPos - Posición destino
   * @param execute - Si true, ejecuta el movimiento; si false, solo valida
   * @returns Resultado del movimiento o validación
   */
  private validateMoveInternal(fromPos: Position, toPos: Position, execute: boolean): MoveResult {
    if (!this.isGameActive()) {
      return { success: false, error: 'Juego no activo' };
    }

    const turnValidation = this.validateTurn(fromPos);
    if (!turnValidation.valid) {
      return { success: false, error: turnValidation.error };
    }

    const board = this.board();
    if (!this.isValidMoveComplete(board, fromPos, toPos)) {
      const piece = getPieceAtPosition(board, fromPos);
      const pieceName = piece ? `${piece.type} ${piece.color}` : 'pieza';
      return { success: false, error: `El ${pieceName} no puede moverse a esa posición` };
    }

    const targetPiece = getPieceAtPosition(board, toPos);
    const moveType = targetPiece ? 'capture' : 'normal';

    if (execute) {
      const moveResult = this.performMoveWithResult(fromPos, toPos, targetPiece);
      return moveResult;
    }

    return {
      success: true,
      captured: targetPiece || undefined,
      moveType
    };
  }

  /**
   * Optimizaciones y métodos auxiliares
   */
  private shouldAiMove(): boolean {
    return this.currentTurn() === PieceColor.Black &&
      this.isGameActive() &&
      this.gameInitialized() &&
      this.aiEnabled() &&
      !this.aiMoveInProgress;
  }

  /**
   * Programa el movimiento de la IA
   */
  private scheduleAiMove(): void {
    if (this.aiMoveInProgress) return;

    this.aiMoveInProgress = true;
    setTimeout(() => {
      this.makeAiMove();
      this.aiMoveInProgress = false;
    }, 1000);
  }

  /**
   * Reinicia el estado del juego
   */
  private resetGameState(): void {
    this.isLoading.set(true);
    this.currentTurn.set(PieceColor.White);
    this.gameOver.set(false);
    this.winnerColor.set(null);
    this.showVictoryModal.set(false);
    this.moveHistory.set([]);
    this.totalMovements.set(0);
    this.whiteCaptures.set(0);
    this.blackCaptures.set(0);
    this.aiMovesCache.clear();
    this.aiMoveInProgress = false;
    this.previousBoard = [];
  }

  /**
   * Finaliza la inicialización del juego
   */
  private finalizeGameInitialization(): void {
    this.isLoading.set(false);
    this.gameInitialized.set(true);
    this.showInitialAnimations.set(true);
    setTimeout(() => {
      this.showInitialAnimations.set(false);
    }, 2000);
  }

  /**
   * Valida si es el turno del jugador correspondiente
   * @param fromPos - Posición de la pieza a mover
   * @returns Objeto con el resultado de la validación
   */
  private validateTurn(fromPos: Position): { valid: boolean; error?: string } {
    const piece = getPieceAtPosition(this.board(), fromPos);

    if (!piece) {
      return { valid: false, error: 'No hay pieza en esa posición' };
    }

    if (piece.color !== this.currentTurn()) {
      const turn = this.currentTurn() === PieceColor.White ? 'blancas' : 'negras';
      return { valid: false, error: `Es el turno de las ${turn}` };
    }

    return { valid: true };
  }

  /**
   * Verifica si un movimiento es válido en su totalidad
   * @param board - Tablero actual
   * @param fromPos - Posición de origen
   * @param toPos - Posición de destino
   * @returns Verdadero si el movimiento es válido, falso en caso contrario
   */
  private isValidMoveComplete(board: ChessSquare[][], fromPos: Position, toPos: Position): boolean {
    const fromCoords = positionToCoordinates(fromPos);
    const toCoords = positionToCoordinates(toPos);
    const piece = getPieceAtPosition(board, fromPos);

    if (!piece) return false;

    return this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col]);
  }

  /**
   * Verifica si un movimiento es válido aplicando las reglas específicas de cada pieza
   * @param board - Tablero actual
   * @param piece - Pieza a mover
   * @param from - Coordenadas de origen [fila, columna]
   * @param to - Coordenadas de destino [fila, columna]
   * @returns Verdadero si el movimiento cumple las reglas de la pieza, falso en caso contrario
   */
  private isValidMoveByRules(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    const [toRow, toCol] = to;
    
    // Validar límites del tablero
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) {
      return false;
    }
    
    const targetPiece = board[toRow][toCol].piece;

    // No se puede capturar una pieza del mismo color
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    switch (piece.type) {
      case PieceType.Pawn:
        return isValidPawnMove(board, piece, from, to);
      case PieceType.Rook:
        return isValidRookMove(board, piece, from, to);
      case PieceType.Knight:
        return isValidKnightMove(board, piece, from, to);
      case PieceType.Bishop:
        return isValidBishopMove(board, piece, from, to);
      case PieceType.Queen:
        return isValidQueenMove(board, piece, from, to);
      case PieceType.King:
        return isValidKingMove(board, piece, from, to);
      default:
        return false;
    }
  }

  /**
   * Ejecuta un movimiento y retorna el resultado
   * @param fromPos - Posición de origen
   * @param toPos - Posición de destino
   * @param capturedPiece - Pieza capturada (si la hay)
   * @returns Resultado del movimiento
   */
  private performMoveWithResult(fromPos: Position, toPos: Position, capturedPiece?: ChessPiece | null): MoveResult {
    const board = this.board();
    const newBoard = deepCloneBoard(board);

    const fromSquare = getSquareAtPosition(newBoard, fromPos);
    const toSquare = getSquareAtPosition(newBoard, toPos);

    if (!fromSquare || !toSquare) {
      return { success: false, error: 'Posición inválida en el tablero' };
    }

    if (!fromSquare.piece) {
      return { success: false, error: 'No hay pieza en la posición de origen' };
    }

    // Usar la pieza capturada pasada como parámetro, o la pieza en la casilla destino
    const targetPiece = capturedPiece !== undefined ? capturedPiece : toSquare.piece;

    // Actualizar la posición de la pieza movida
    toSquare.piece = { ...fromSquare.piece, position: toPos };
    fromSquare.piece = null;

    // Aplicar el cambio al tablero
    this.board.set(newBoard);

    const moveType = targetPiece ? 'capture' : 'normal';

    return {
      success: true,
      captured: targetPiece || undefined,
      moveType
    };
  }

  /**
   * Procesa un movimiento detectado y actualiza el estado del juego
   * @param previousBoard - Tablero anterior
   * @param currentBoard - Tablero actual
   */
  private processMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): void {
    const moveData = this.detectMove(previousBoard, currentBoard);

    if (moveData.movedPiece) {
      this.updateGameStateAfterMove(moveData);
    }
  }

  /**
   * Detecta movimientos comparando tableros de forma optimizada
   * @param previousBoard - Tablero anterior
   * @param currentBoard - Tablero actual
   * @returns Datos del movimiento detectado
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
   * Actualiza el estado del juego después de un movimiento
   * @param moveData - Datos del movimiento
   */
  private updateGameStateAfterMove(moveData: MoveData): void {
    const { sourcePos, targetPos, movedPiece, capturedPiece } = moveData;

    if (!movedPiece || !sourcePos || !targetPos) return;

    this.aiMovesCache.clear();

    if (capturedPiece) {
      this.updateCaptures(capturedPiece.color);
    }

    const nextTurn = movedPiece.color === PieceColor.White ? PieceColor.Black : PieceColor.White;
    this.currentTurn.set(nextTurn);

    this.totalMovements.update(v => v + 1);
    const moveNotation = generateMoveNotation(movedPiece, sourcePos, targetPos, capturedPiece);
    this.moveHistory.update(h => [...h, moveNotation]);
  }

  /**
   * Actualiza el contador de piezas capturadas
   * @param capturedColor - Color de la pieza capturada
   */
  private updateCaptures(capturedColor: PieceColor): void {
    if (capturedColor === PieceColor.White) {
      this.whiteCaptures.update(v => v + 1);
    } else {
      this.blackCaptures.update(v => v + 1);
    }
  }

  /**
   * Configura la posición inicial de las piezas en el tablero
   * @param board - Tablero a configurar
   */
  private setupInitialPosition(board: ChessSquare[][]): void {
    // Configurar piezas blancas y negras en un solo bucle
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

  /**
   * Verifica el estado del juego
   */
  private checkGameStatus(): void {
    const currentBoard = this.board();
    const kingsExist = findKings(currentBoard);

    // Si falta un rey, termina la partida (como antes)
    if (!kingsExist.white) {
      this.endGame(PieceColor.Black);
      return;
    }
    if (!kingsExist.black) {
      this.endGame(PieceColor.White);
      return;
    }

    // Detectar jaque: si alguna pieza del oponente puede capturar el rey
    const whiteKingPos = this.findKingPosition(currentBoard, PieceColor.White);
    const blackKingPos = this.findKingPosition(currentBoard, PieceColor.Black);

    let whiteInCheck = false;
    let blackInCheck = false;

    if (whiteKingPos) {
      const opponents = getAllPiecesForColor(currentBoard, PieceColor.Black);
      for (const p of opponents) {
        const moves = this.getValidMovesForPieceWithRules(currentBoard, p);
        if (moves.includes(whiteKingPos)) {
          whiteInCheck = true;
          break;
        }
      }
    }

    if (blackKingPos) {
      const opponents = getAllPiecesForColor(currentBoard, PieceColor.White);
      for (const p of opponents) {
        const moves = this.getValidMovesForPieceWithRules(currentBoard, p);
        if (moves.includes(blackKingPos)) {
          blackInCheck = true;
          break;
        }
      }
    }

    this.whiteInCheck.set(whiteInCheck);
    this.blackInCheck.set(blackInCheck);
  }

  /**
   * Busca la posición del rey de un color dado
   */
  private findKingPosition(board: ChessSquare[][], color: PieceColor): Position | null {
    for (const row of board) {
      for (const sq of row) {
        if (sq.piece && sq.piece.type === PieceType.King && sq.piece.color === color) {
          return sq.position;
        }
      }
    }
    return null;
  }

  /**
   * Finaliza el juego
   * @param winner - Color de la pieza ganadora
   */
  private endGame(winner: PieceColor): void {
    this.gameOver.set(true);
    this.winnerColor.set(winner);
    setTimeout(() => {
      this.showVictoryModal.set(true);
    }, 100);
  }

  /**
   * Ejecuta un movimiento de la IA usando las reglas existentes
   */
  private makeAiMove(): void {
    const board = this.board();
    const bestMove = this.findBestMoveForAi(board);

    if (bestMove) {
      this.makeMove(bestMove.from, bestMove.to);
    }
  }

  /**
   * Encuentra el mejor movimiento para la IA usando las reglas de movimiento
   * @param board - Tablero actual
   * @returns Mejor movimiento encontrado o null si no hay movimientos válidos
   */
  private findBestMoveForAi(board: ChessSquare[][]): AiMove | null {
    const difficulty = this.aiDifficulty();
    const blackPieces = getAllPiecesForColor(board, PieceColor.Black);
    const possibleMoves: AiMove[] = [];

    for (const piecePos of blackPieces) {
      const validMoves = this.getValidMovesForPieceWithRules(board, piecePos);

      for (const targetPos of validMoves) {
        const baseScore = this.evaluateMove(board, piecePos, targetPos);
        possibleMoves.push({ from: piecePos, to: targetPos, score: baseScore });
      }
    }

    if (possibleMoves.length === 0) return null;

    // Ordenar por score base
    possibleMoves.sort((a, b) => b.score - a.score);

    if (difficulty === 1) {
      // Easy: elegir entre los mejores N con alto componente aleatorio
      const topN = Math.max(1, Math.floor(possibleMoves.length * 0.2));
      const slice = possibleMoves.slice(0, topN);
      return slice[Math.floor(Math.random() * slice.length)];
    }

    if (difficulty === 2) {
      // Medium: elegir el mejor según heurística, poca aleatoriedad
      // ya están ordenados
      return possibleMoves[0];
    }

    // Hard: usar minimax a profundidad 2 para mirar respuesta del rival
    let bestMove: AiMove | null = null;
    let bestScore = -Infinity;
    const depth = 2; // búsqueda a 2 plies (IA->oponente)

    for (const m of possibleMoves) {
      const nb = this.simulateMove(board, m.from, m.to);
      const score = this.minimaxEvaluate(nb, depth - 1, false);
      // pequeña sutilización con heurística previa
      const finalScore = score + m.score * 0.1;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMove = { ...m, score: finalScore };
      }
    }

    return bestMove || possibleMoves[0];
  }

  /**
   * Obtiene movimientos válidos para una pieza usando cache y las reglas existentes
   * @param board - Tablero actual
   * @param position - Posición de la pieza
   * @returns Movimientos válidos para la pieza
   */
  private getValidMovesForPieceWithRules(board: ChessSquare[][], position: Position): Position[] {
    const boardHash = this.generateBoardHash(board);
    const cacheKey = `${position}-${boardHash}`;

    if (this.aiMovesCache.has(cacheKey)) {
      return this.aiMovesCache.get(cacheKey)!;
    }

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

    if (this.aiMovesCache.size < 100) {
      this.aiMovesCache.set(cacheKey, validMoves);
    }

    return validMoves;
  }

  /**
   * Genera un hash simple del tablero para la cache
   * @param board - Tablero actual
   * @returns Hash del tablero
   */
  private generateBoardHash(board: ChessSquare[][]): string {
    let hash = '';
    for (const row of board) {
      for (const square of row) {
        hash += square.piece ? `${square.piece.type}${square.piece.color}${square.position}` : '0';
      }
    }
    return hash.slice(0, 50);
  }

  /**
   * Establece la dificultad de la IA: 'easy' | 'medium' | 'hard' o número 1..3
   * @param level - Nivel de dificultad
   */
  public setAiDifficulty(level: 'easy' | 'medium' | 'hard' | number): void {
    let val = 2;
    if (typeof level === 'number') {
      val = Math.max(1, Math.min(3, Math.floor(level)));
    } else {
      if (level === 'easy') val = 1;
      else if (level === 'medium') val = 2;
      else if (level === 'hard') val = 3;
    }
    this.aiDifficulty.set(val);
    // Limpiar cache cuando cambie dificultad
    this.aiMovesCache.clear();
  }

  /**
   * Evalúa la calidad de un movimiento con heurísticas mejoradas
   * @param board - Tablero actual
   * @param from - Posición de origen
   * @param to - Posición de destino
   * @returns Puntuación del movimiento
   */
  private evaluateMove(board: ChessSquare[][], from: Position, to: Position): number {
    let score = 0;

    const movingPiece = getPieceAtPosition(board, from);
    const targetPiece = getPieceAtPosition(board, to);

    if (!movingPiece) return score;

    if (targetPiece) {
      score += getPieceValue(targetPiece.type) * 10;
    }

    const toCoords = positionToCoordinates(to);
    if (movingPiece.type !== PieceType.King) {
      score += getCenterPositionBonus(toCoords) * 2;
    }

    if (movingPiece.type === PieceType.King) {
      score -= 2;
    }

    const fromCoords = positionToCoordinates(from);
    if ((movingPiece.color === PieceColor.Black && fromCoords.row <= 1) ||
      (movingPiece.color === PieceColor.White && fromCoords.row >= 6)) {
      score += 1;
    }

    score += Math.random() * 0.5;

    return score;
  }

  /**
   * Simula un movimiento y devuelve un nuevo tablero clonado con el movimiento aplicado
   * @param board - Tablero actual
   * @param from - Posición de origen
   * @param to - Posición de destino
   * @returns Nuevo tablero con el movimiento simulado
   */
  private simulateMove(board: ChessSquare[][], from: Position, to: Position): ChessSquare[][] {
    const newBoard = deepCloneBoard(board);
    const fromSq = getSquareAtPosition(newBoard, from);
    const toSq = getSquareAtPosition(newBoard, to);
    if (!fromSq || !toSq || !fromSq.piece) return newBoard;

    toSq.piece = { ...fromSq.piece, position: to };
    fromSq.piece = null;
    return newBoard;
  }

  /**
   * Minimax simplificado (sin poda alpha-beta) para profundidad corta.
   * Devuelve la puntuación heurística del tablero desde la perspectiva de las negras (IA).
   * @param board - Tablero actual
   * @param depth - Profundidad de búsqueda
   * @param maximizingPlayer - Indica si es el turno del jugador maximizar (negras)
   * @returns Puntuación heurística del tablero
   */
  private minimaxEvaluate(board: ChessSquare[][], depth: number, maximizingPlayer: boolean): number {
    if (depth === 0) {
      let total = 0;
      for (const row of board) {
        for (const sq of row) {
          if (!sq.piece) continue;
          const val = getPieceValue(sq.piece.type);
          total += sq.piece.color === PieceColor.Black ? val : -val;
        }
      }
      return total;
    }

    if (maximizingPlayer) {
      const moves: AiMove[] = [];
      const pieces = getAllPiecesForColor(board, PieceColor.Black);
      for (const p of pieces) {
        const targets = this.getValidMovesForPieceWithRules(board, p);
        for (const t of targets) moves.push({ from: p, to: t, score: 0 });
      }

      if (moves.length === 0) return this.minimaxEvaluate(board, 0, false);

      let best = -Infinity;
      for (const m of moves) {
        const nb = this.simulateMove(board, m.from, m.to);
        const val = this.minimaxEvaluate(nb, depth - 1, false);
        if (val > best) best = val;
      }
      return best;
    } else {
      const moves: AiMove[] = [];
      const pieces = getAllPiecesForColor(board, PieceColor.White);
      for (const p of pieces) {
        const targets = this.getValidMovesForPieceWithRules(board, p);
        for (const t of targets) moves.push({ from: p, to: t, score: 0 });
      }

      if (moves.length === 0) return this.minimaxEvaluate(board, 0, true);

      let best = Infinity;
      for (const m of moves) {
        const nb = this.simulateMove(board, m.from, m.to);
        const val = this.minimaxEvaluate(nb, depth - 1, true);
        if (val < best) best = val;
      }
      return best;
    }
  }
}
