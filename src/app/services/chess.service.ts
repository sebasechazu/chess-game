
import { Injectable, signal, computed, WritableSignal, effect } from '@angular/core';
import { 
  ChessPiece, 
  PieceType, 
  PieceColor, 
  ChessSquare, 
  SquareColor,
  MoveResult,
  AiMove,
  MoveData,
  ModalData,
  WinnerType,
  Position,
  Coordinates,
  PIECE_VALUES,
  PIECE_SYMBOLS
} from '../helpers/interfaces';
import { 
  isValidPawnMove, 
  isValidRookMove, 
  isValidKnightMove, 
  isValidBishopMove, 
  isValidQueenMove, 
  isValidKingMove 
} from '../helpers/chess-move-rules';

@Injectable({ providedIn: 'root' })
export class ChessService {
  // ===== SIGNALS DE ESTADO =====
  public readonly board: WritableSignal<ChessSquare[][]> = signal<ChessSquare[][]>([]);
  public readonly currentTurn: WritableSignal<PieceColor> = signal<PieceColor>(PieceColor.White);
  public readonly gameOver: WritableSignal<boolean> = signal<boolean>(false);
  public readonly winnerColor: WritableSignal<WinnerType> = signal<WinnerType>(null);
  public readonly showVictoryModal: WritableSignal<boolean> = signal<boolean>(false);
  public readonly gameInitialized: WritableSignal<boolean> = signal<boolean>(false);
  public readonly showInitialAnimations: WritableSignal<boolean> = signal<boolean>(false);
  public readonly isLoading: WritableSignal<boolean> = signal<boolean>(true);
  public readonly moveHistory: WritableSignal<string[]> = signal<string[]>([]);
  public readonly totalMovements: WritableSignal<number> = signal<number>(0);
  public readonly whiteCaptures: WritableSignal<number> = signal<number>(0);
  public readonly blackCaptures: WritableSignal<number> = signal<number>(0);
  public readonly aiEnabled: WritableSignal<boolean> = signal<boolean>(true);

  // ===== COMPUTED SIGNALS =====
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

  public readonly isGameActive = computed(() => 
    this.gameInitialized() && !this.gameOver()
  );

  // ===== ESTADO PRIVADO =====
  private previousBoard: ChessSquare[][] = [];
  private aiMoveInProgress = false;

  constructor() {
    // ===== EFFECTS =====
    
    // Effect para detectar cambios en el tablero y actualizar el estado del juego
    effect(() => {
      const currentBoard = this.board();
      if (!this.gameInitialized() || currentBoard.length === 0) return;
      
      // Evitar procesamiento innecesario si es la inicialización
      if (this.previousBoard.length === 0) {
        this.previousBoard = this.deepCloneBoard(currentBoard);
        return;
      }
      
      // Detectar y procesar movimiento
      if (this.hasBoardChanged(this.previousBoard, currentBoard)) {
        this.processMove(this.previousBoard, currentBoard);
        this.previousBoard = this.deepCloneBoard(currentBoard);
        this.checkGameStatus();
      }
    });

    // Effect optimizado para la IA
    effect(() => {
      if (this.shouldAiMove()) {
        this.scheduleAiMove();
      }
    });
  }

  // ===== MÉTODOS PÚBLICOS =====

  initializeGame(): void {
    this.resetGameState();
    const newBoard = this.createEmptyBoard();
    this.setupInitialPosition(newBoard);
    this.board.set(newBoard);
    this.previousBoard = this.deepCloneBoard(newBoard);
    this.finalizeGameInitialization();
  }

  resetGame(): void {
    this.initializeGame();
  }

  /**
   * Método público para ejecutar un movimiento con validación completa
   */
  public executeMove(fromPos: string, toPos: string): boolean {
    if (!this.isGameActive() || !this.isValidTurn(fromPos)) {
      return false;
    }

    const board = this.board();
    if (!this.isValidMoveComplete(board, fromPos, toPos)) {
      return false;
    }

    return this.performMove(fromPos, toPos);
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Optimizaciones y métodos auxiliares
   */
  private deepCloneBoard(board: ChessSquare[][]): ChessSquare[][] {
    return board.map(row => 
      row.map(square => ({ 
        ...square, 
        piece: square.piece ? { ...square.piece } : null 
      }))
    );
  }

  private hasBoardChanged(previous: ChessSquare[][], current: ChessSquare[][]): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const prevPiece = previous[row]?.[col]?.piece;
        const currPiece = current[row]?.[col]?.piece;
        
        if (!prevPiece && !currPiece) continue;
        if (!prevPiece || !currPiece) return true;
        if (prevPiece.id !== currPiece.id) return true;
      }
    }
    return false;
  }

  private shouldAiMove(): boolean {
    return this.currentTurn() === PieceColor.Black && 
           this.isGameActive() && 
           this.gameInitialized() &&
           this.aiEnabled() &&
           !this.aiMoveInProgress;
  }

  private scheduleAiMove(): void {
    if (this.aiMoveInProgress) return;
    
    this.aiMoveInProgress = true;
    setTimeout(() => {
      this.makeAiMove();
      this.aiMoveInProgress = false;
    }, 1000);
  }

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
  }

  private createEmptyBoard(): ChessSquare[][] {
    const board: ChessSquare[][] = [];
    for (let row = 0; row < 8; row++) {
      const boardRow: ChessSquare[] = [];
      for (let col = 0; col < 8; col++) {
        const file = String.fromCharCode(97 + col);
        const rank = 8 - row;
        const position = `${file}${rank}`;
        boardRow.push({
          position,
          color: (row + col) % 2 === 0 ? SquareColor.Light : SquareColor.Dark,
          piece: null
        });
      }
      board.push(boardRow);
    }
    return board;
  }

  private finalizeGameInitialization(): void {
    this.isLoading.set(false);
    this.gameInitialized.set(true);
    this.showInitialAnimations.set(true);
    setTimeout(() => {
      this.showInitialAnimations.set(false);
    }, 2000);
  }

  private isValidTurn(fromPos: string): boolean {
    const piece = this.getPieceAtPosition(this.board(), fromPos);
    return piece !== null && piece.color === this.currentTurn();
  }

  private isValidMoveComplete(board: ChessSquare[][], fromPos: string, toPos: string): boolean {
    const fromCoords = this.positionToCoordinates(fromPos);
    const toCoords = this.positionToCoordinates(toPos);
    const piece = this.getPieceAtPosition(board, fromPos);
    
    if (!piece) return false;
    
    return this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col]);
  }

  private isValidMoveByRules(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    const targetPiece = board[to[0]][to[1]].piece;
    
    // No puede capturar sus propias piezas
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

  private performMove(fromPos: string, toPos: string): boolean {
    const board = this.board();
    const newBoard = this.deepCloneBoard(board);
    
    const fromSquare = this.getSquareAtPosition(newBoard, fromPos);
    const toSquare = this.getSquareAtPosition(newBoard, toPos);

    if (!fromSquare?.piece || !toSquare) return false;

    // Ejecutar el movimiento
    toSquare.piece = { ...fromSquare.piece, position: toPos };
    fromSquare.piece = null;
    
    this.board.set(newBoard);
    return true;
  }

  private processMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): void {
    const moveData = this.detectMove(previousBoard, currentBoard);
    
    if (moveData.movedPiece) {
      this.updateGameStateAfterMove(moveData);
    }
  }

  /**
   * Detecta movimientos comparando tableros y devuelve datos estructurados
   */
  private detectMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): MoveData {
    let sourcePos = '';
    let targetPos = '';
    let movedPiece: ChessPiece | null = null;
    let capturedPiece: ChessPiece | null = null;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const prevPiece = previousBoard[row]?.[col]?.piece;
        const currentPiece = currentBoard[row]?.[col]?.piece;
        
        if (prevPiece && !currentPiece) {
          sourcePos = previousBoard[row][col].position;
          movedPiece = prevPiece;
        }
        
        if (!prevPiece && currentPiece) {
          targetPos = currentBoard[row][col].position;
        } else if (prevPiece && currentPiece && prevPiece.id !== currentPiece.id) {
          targetPos = currentBoard[row][col].position;
          capturedPiece = prevPiece;
        }
      }
    }

    return { sourcePos, targetPos, movedPiece, capturedPiece };
  }

  /**
   * Actualiza el estado del juego después de un movimiento
   */
  private updateGameStateAfterMove(moveData: MoveData): void {
    const { sourcePos, targetPos, movedPiece, capturedPiece } = moveData;
    
    if (!movedPiece || !sourcePos || !targetPos) return;

    // Actualizar capturas
    if (capturedPiece) {
      this.updateCaptures(capturedPiece.color);
    }

    // Cambiar turno
    const nextTurn = movedPiece.color === PieceColor.White ? PieceColor.Black : PieceColor.White;
    this.currentTurn.set(nextTurn);

    // Actualizar contadores y historial
    this.totalMovements.update(v => v + 1);
    const moveNotation = this.generateMoveNotation(movedPiece, sourcePos, targetPos, capturedPiece);
    this.moveHistory.update(h => [...h, moveNotation]);
  }

  private updateCaptures(capturedColor: PieceColor): void {
    if (capturedColor === PieceColor.White) {
      this.whiteCaptures.update(v => v + 1);
    } else {
      this.blackCaptures.update(v => v + 1);
    }
  }

  /**
   * Configura la posición inicial de las piezas en el tablero
   */
  private setupInitialPosition(board: ChessSquare[][]): void {
    const pieceOrder = [PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen, PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook] as const;

    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      this.placePiece(board, `${file}1`, { id: col + 1, type: pieceOrder[col], color: PieceColor.White, position: `${file}1` });
      this.placePiece(board, `${file}2`, { id: 9 + col, type: PieceType.Pawn, color: PieceColor.White, position: `${file}2` });
    }

    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      this.placePiece(board, `${file}8`, { id: 17 + col, type: pieceOrder[col], color: PieceColor.Black, position: `${file}8` });
      this.placePiece(board, `${file}7`, { id: 25 + col, type: PieceType.Pawn, color: PieceColor.Black, position: `${file}7` });
    }
  }

  private placePiece(board: ChessSquare[][], position: string, piece: ChessPiece): void {
    const [file, rank] = position.split('');
    const col = file.charCodeAt(0) - 97;
    const row = 8 - parseInt(rank);
    if (board[row] && board[row][col]) {
      board[row][col].piece = piece;
    }
  }

  private checkGameStatus(): void {
    const currentBoard = this.board();
    let whiteKingExists = false;
    let blackKingExists = false;
    
    for (const row of currentBoard) {
      for (const square of row) {
        if (square.piece?.type === 'king') {
          if (square.piece.color === PieceColor.White) {
            whiteKingExists = true;
          } else {
            blackKingExists = true;
          }
        }
      }
    }
    
    if (!whiteKingExists) {
      this.gameOver.set(true);
      this.winnerColor.set(PieceColor.Black);
      setTimeout(() => {
        this.showVictoryModal.set(true);
      }, 100);
    } else if (!blackKingExists) {
      this.gameOver.set(true);
      this.winnerColor.set(PieceColor.White);
      setTimeout(() => {
        this.showVictoryModal.set(true);
      }, 100);
    }
  }

  /**
   * Detecta movimientos comparando el tablero anterior con el actual y actualiza los signals
   */
  private detectAndUpdateMove(previousBoard: ChessSquare[][], currentBoard: ChessSquare[][]): void {
    let sourcePos = '';
    let targetPos = '';
    let movedPiece: ChessPiece | null = null;
    let capturedPiece: ChessPiece | null = null;

    // Encontrar la casilla que perdió una pieza (origen)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const prevPiece = previousBoard[row]?.[col]?.piece;
        const currentPiece = currentBoard[row]?.[col]?.piece;
        
        // Se perdió una pieza en esta casilla
        if (prevPiece && !currentPiece) {
          sourcePos = previousBoard[row][col].position;
          movedPiece = prevPiece;
        }
        
        // Se ganó una pieza en esta casilla o cambió la pieza
        if (!prevPiece && currentPiece) {
          targetPos = currentBoard[row][col].position;
        } else if (prevPiece && currentPiece && prevPiece.id !== currentPiece.id) {
          targetPos = currentBoard[row][col].position;
          capturedPiece = prevPiece;
        }
      }
    }

    // Si detectamos un movimiento válido, actualizamos los signals
    if (sourcePos && targetPos && movedPiece) {
      // Verificar si hay captura
      if (capturedPiece) {
        if (capturedPiece.color === PieceColor.White) {
          this.whiteCaptures.update(v => v + 1);
        } else {
          this.blackCaptures.update(v => v + 1);
        }
      }

      // Actualizar turno basado en el color de la pieza que se movió
      const nextTurn = movedPiece.color === PieceColor.White ? PieceColor.Black : PieceColor.White;
      this.currentTurn.set(nextTurn);

      // Actualizar movimientos
      this.totalMovements.update(v => v + 1);

      // Actualizar historial
      const moveNotation = this.generateMoveNotation(movedPiece, sourcePos, targetPos, capturedPiece);
      this.moveHistory.update(h => [...h, moveNotation]);
    }
  }

  /**
   * Genera la notación algebraica de un movimiento usando constantes centralizadas
   */
  private generateMoveNotation(piece: ChessPiece, sourcePos: Position, targetPos: Position, capturedPiece: ChessPiece | null): string {
    const symbol = PIECE_SYMBOLS[piece.type];
    const capture = capturedPiece ? 'x' : '';
    return `${symbol}${sourcePos}${capture}${targetPos}`;
  }

  // ===== MÉTODOS DE IA MEJORADOS =====

  /**
   * Ejecuta un movimiento de la IA usando las reglas existentes
   */
  private makeAiMove(): void {
    const board = this.board();
    const bestMove = this.findBestMoveForAi(board);

    if (bestMove) {
      this.executeMove(bestMove.from, bestMove.to);
    }
  }

  /**
   * Encuentra el mejor movimiento para la IA usando las reglas de movimiento
   */
  private findBestMoveForAi(board: ChessSquare[][]): AiMove | null {
    const blackPieces = this.getAllPiecesForColor(board, PieceColor.Black);
    const possibleMoves: AiMove[] = [];

    for (const piecePos of blackPieces) {
      const validMoves = this.getValidMovesForPieceWithRules(board, piecePos);
      
      for (const targetPos of validMoves) {
        const score = this.evaluateMove(board, piecePos, targetPos);
        possibleMoves.push({ from: piecePos, to: targetPos, score });
      }
    }

    if (possibleMoves.length === 0) return null;

    // Ordenar por score y tomar el mejor
    possibleMoves.sort((a, b) => b.score - a.score);
    return possibleMoves[0];
  }

  /**
   * Obtiene movimientos válidos para una pieza usando las reglas existentes
   */
  private getValidMovesForPieceWithRules(board: ChessSquare[][], position: Position): Position[] {
    const validMoves: Position[] = [];
    const piece = this.getPieceAtPosition(board, position);
    
    if (!piece) return validMoves;

    const fromCoords = this.positionToCoordinates(position);

    // Revisar todas las casillas del tablero
    for (const row of board) {
      for (const square of row) {
        if (position === square.position) continue;
        
        const toCoords = this.positionToCoordinates(square.position);
        
        if (this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col])) {
          validMoves.push(square.position);
        }
      }
    }
    
    return validMoves;
  }

  /**
   * Evalúa la calidad de un movimiento con mejor heurística usando constantes centralizadas
   */
  private evaluateMove(board: ChessSquare[][], from: Position, to: Position): number {
    let score = 0;
    
    const targetPiece = this.getPieceAtPosition(board, to);
    
    // Bonificación por capturar piezas usando valores centralizados
    if (targetPiece) {
      score += PIECE_VALUES[targetPiece.type] || 0;
    }
    
    // Bonificación por posición central
    const toCoords = this.positionToCoordinates(to);
    const centerBonus = this.getCenterPositionBonus(toCoords);
    score += centerBonus;
    
    // Aleatoriedad controlada para variabilidad
    score += Math.random() * 0.1;
    
    return score;
  }

  private getCenterPositionBonus(coords: Coordinates): number {
    const centerDistance = Math.abs(3.5 - coords.row) + Math.abs(3.5 - coords.col);
    return Math.max(0, 3 - centerDistance * 0.1);
  }

  /**
   * Obtiene todas las piezas de un color específico
   */
  private getAllPiecesForColor(board: ChessSquare[][], color: PieceColor): Position[] {
    const pieces: Position[] = [];
    
    for (const row of board) {
      for (const square of row) {
        if (square.piece && square.piece.color === color) {
          pieces.push(square.position);
        }
      }
    }
    
    return pieces;
  }

  /**
   * Convierte coordenadas de fila/columna a posición de ajedrez
   */
  private coordinatesToPosition(row: number, col: number): Position {
    const file = String.fromCharCode(97 + col);
    const rank = 8 - row;
    return `${file}${rank}`;
  }

  // ===== MÉTODOS UTILITARIOS =====
  
  /**
   * Utilidades auxiliares optimizadas
   */
  private positionToCoordinates(position: Position): Coordinates {
    const file = position.charCodeAt(0) - 97;
    const rank = parseInt(position.charAt(1)) - 1;
    return { row: 7 - rank, col: file };
  }

  private getPieceAtPosition(board: ChessSquare[][], position: Position): ChessPiece | null {
    const square = this.getSquareAtPosition(board, position);
    return square ? square.piece : null;
  }

  private getSquareAtPosition(board: ChessSquare[][], position: Position): ChessSquare | null {
    for (const row of board) {
      for (const square of row) {
        if (square.position === position) {
          return square;
        }
      }
    }
    return null;
  }
}
