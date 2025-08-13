
import { Injectable, signal, computed, WritableSignal, effect, inject } from '@angular/core';
import { ChessPiece, PieceType, PieceColor } from '../interfaces/chess-piece.interface';
import { ChessSquare, SquareColor } from '../interfaces/chess-square.interface';

@Injectable({ providedIn: 'root' })
export class ChessService {
  private previousBoard: ChessSquare[][] = [];
  public readonly aiEnabled: WritableSignal<boolean> = signal<boolean>(true);

  constructor() {
    // Efecto para detectar cambios en el tablero y actualizar el estado del juego
    effect(() => {
      const currentBoard = this.board();
      if (!this.gameInitialized()) return;
      
      // Detectar si hubo un movimiento comparando con el tablero anterior
      if (this.previousBoard.length > 0) {
        this.detectAndUpdateMove(this.previousBoard, currentBoard);
      }
      
      // Actualizar el tablero anterior para la próxima comparación
      this.previousBoard = JSON.parse(JSON.stringify(currentBoard));
      
      this.checkGameStatus();
    });

    // Efecto para activar la IA cuando sea turno de las negras
    effect(() => {
      if (this.currentTurn() === PieceColor.Black && 
          this.isGameActive() && 
          this.gameInitialized() &&
          this.aiEnabled()) {
        // Delay para que se complete la actualización de la UI
        setTimeout(() => {
          this.makeAiMove();
        }, 1000);
      }
    });
  }

  public readonly board: WritableSignal<ChessSquare[][]> = signal<ChessSquare[][]>([]);

  public readonly currentTurn: WritableSignal<PieceColor> = signal<PieceColor>(PieceColor.White);
  public readonly gameOver: WritableSignal<boolean> = signal<boolean>(false);
  public readonly winnerColor: WritableSignal<PieceColor | 'draw' | null> = signal<PieceColor | 'draw' | null>(null);
  public readonly showVictoryModal: WritableSignal<boolean> = signal<boolean>(false);
  public readonly gameInitialized: WritableSignal<boolean> = signal<boolean>(false);
  public readonly showInitialAnimations: WritableSignal<boolean> = signal<boolean>(false);
  public readonly isLoading: WritableSignal<boolean> = signal<boolean>(true);
  public readonly moveHistory: WritableSignal<string[]> = signal<string[]>([]);
  public readonly totalMovements: WritableSignal<number> = signal<number>(0);
  public readonly whiteCaptures: WritableSignal<number> = signal<number>(0);
  public readonly blackCaptures: WritableSignal<number> = signal<number>(0);

  public readonly victoryModalData = computed(() => {
    // Debe estar abierto el modal Y el juego debe estar terminado
    if (!this.showVictoryModal() || !this.gameOver()) {
      return { open: false, title: '', content: '' };
    }
    
    let content = 'Partida en tablas';
    const winner = this.winnerColor();
    
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

  public readonly isGameActive = computed(() => this.gameInitialized() && !this.gameOver());

  initializeGame(): void {
    this.isLoading.set(true);
    const newBoard: ChessSquare[][] = [];
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
      newBoard.push(boardRow);
    }
    this.setupInitialPosition(newBoard);
    this.board.set(newBoard);
    this.previousBoard = JSON.parse(JSON.stringify(newBoard)); // Inicializar el tablero anterior
    this.currentTurn.set(PieceColor.White);
    this.gameOver.set(false);
    this.winnerColor.set(null);
    this.showVictoryModal.set(false);
    this.isLoading.set(false);
    this.gameInitialized.set(true);
    this.moveHistory.set([]);
    this.showInitialAnimations.set(true);
    setTimeout(() => {
      this.showInitialAnimations.set(false);
    }, 2000);
    this.totalMovements.set(0);
    this.whiteCaptures.set(0);
    this.blackCaptures.set(0);
  }

  resetGame(): void {
    this.initializeGame();
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
   * Genera la notación algebraica de un movimiento
   */
  private generateMoveNotation(piece: ChessPiece, sourcePos: string, targetPos: string, capturedPiece: ChessPiece | null): string {
    const pieceSymbols: Record<PieceType, string> = {
      [PieceType.King]: 'K',
      [PieceType.Queen]: 'Q',
      [PieceType.Rook]: 'R',
      [PieceType.Bishop]: 'B',
      [PieceType.Knight]: 'N',
      [PieceType.Pawn]: ''
    };
    const symbol = pieceSymbols[piece.type];
    const capture = capturedPiece ? 'x' : '';
    return `${symbol}${sourcePos}${capture}${targetPos}`;
  }

  /**
   * Método público para ejecutar un movimiento (usado tanto por jugadores como por la IA)
   */
  public executeMove(fromPos: string, toPos: string): boolean {
    const board = this.board();
    const fromSquare = this.getSquareAtPosition(board, fromPos);
    const toSquare = this.getSquareAtPosition(board, toPos);
    
    if (!fromSquare || !toSquare || !fromSquare.piece) return false;

    // Crear nueva copia del tablero
    const newBoard = board.map(row => row.map(square => ({ ...square })));
    const newFromSquare = this.getSquareAtPosition(newBoard, fromPos);
    const newToSquare = this.getSquareAtPosition(newBoard, toPos);

    if (newFromSquare && newToSquare && newFromSquare.piece) {
      // Ejecutar el movimiento
      newToSquare.piece = { ...newFromSquare.piece, position: toPos };
      newFromSquare.piece = null;
      
      // Actualizar el tablero
      this.board.set(newBoard);
      
      return true;
    }
    
    return false;
  }

  /**
   * Ejecuta un movimiento de la IA
   */
  private makeAiMove(): void {
    const board = this.board();
    const bestMove = this.findBestMoveForAi(board);

    if (bestMove) {
      // Usar el método público para ejecutar el movimiento
      this.executeMove(bestMove.from, bestMove.to);
    }
  }

  /**
   * Encuentra el mejor movimiento para la IA
   */
  private findBestMoveForAi(board: ChessSquare[][]): { from: string; to: string } | null {
    const blackPieces = this.getAllPiecesForColor(board, PieceColor.Black);
    const possibleMoves: { from: string; to: string; score: number }[] = [];

    for (const piecePos of blackPieces) {
      const validMoves = this.getValidMovesForPiece(board, piecePos);
      
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
   * Obtiene todas las piezas de un color
   */
  private getAllPiecesForColor(board: ChessSquare[][], color: PieceColor): string[] {
    const pieces: string[] = [];
    
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
   * Obtiene movimientos válidos básicos para una pieza
   */
  private getValidMovesForPiece(board: ChessSquare[][], position: string): string[] {
    const validMoves: string[] = [];
    const piece = this.getPieceAtPosition(board, position);
    
    if (!piece) return validMoves;

    // Implementación básica - revisar todas las casillas
    for (const row of board) {
      for (const square of row) {
        if (this.isValidMoveBasic(board, position, square.position)) {
          validMoves.push(square.position);
        }
      }
    }
    
    return validMoves;
  }

  /**
   * Verificación básica de movimiento válido
   */
  private isValidMoveBasic(board: ChessSquare[][], from: string, to: string): boolean {
    const fromPiece = this.getPieceAtPosition(board, from);
    const toPiece = this.getPieceAtPosition(board, to);
    
    if (!fromPiece || from === to) return false;
    
    // No puede capturar sus propias piezas
    if (toPiece && toPiece.color === fromPiece.color) return false;
    
    // Movimientos básicos por tipo de pieza
    const fromCoords = this.positionToCoordinates(from);
    const toCoords = this.positionToCoordinates(to);
    const rowDiff = Math.abs(toCoords.row - fromCoords.row);
    const colDiff = Math.abs(toCoords.col - fromCoords.col);

    switch (fromPiece.type) {
      case PieceType.Pawn:
        // Peón negro: hacia adelante (incrementar fila)
        if (fromCoords.col === toCoords.col && !toPiece) {
          return (toCoords.row - fromCoords.row === 1) || 
                 (fromCoords.row === 1 && toCoords.row === 3);
        } else if (colDiff === 1 && toCoords.row - fromCoords.row === 1 && toPiece) {
          return true; // Captura diagonal
        }
        return false;
      
      case PieceType.Rook:
        return (rowDiff === 0 || colDiff === 0) && this.isPathClear(board, from, to);
      
      case PieceType.Bishop:
        return rowDiff === colDiff && this.isPathClear(board, from, to);
      
      case PieceType.Queen:
        return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && this.isPathClear(board, from, to);
      
      case PieceType.King:
        return rowDiff <= 1 && colDiff <= 1;
      
      case PieceType.Knight:
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      
      default:
        return false;
    }
  }

  /**
   * Verifica si el camino entre dos posiciones está despejado
   */
  private isPathClear(board: ChessSquare[][], from: string, to: string): boolean {
    const fromCoords = this.positionToCoordinates(from);
    const toCoords = this.positionToCoordinates(to);
    
    const rowStep = Math.sign(toCoords.row - fromCoords.row);
    const colStep = Math.sign(toCoords.col - fromCoords.col);
    
    let currentRow = fromCoords.row + rowStep;
    let currentCol = fromCoords.col + colStep;
    
    while (currentRow !== toCoords.row || currentCol !== toCoords.col) {
      const position = this.coordinatesToPosition(currentRow, currentCol);
      if (this.getPieceAtPosition(board, position)) {
        return false; // Hay una pieza en el camino
      }
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true;
  }

  /**
   * Convierte coordenadas de fila/columna a posición de ajedrez
   */
  private coordinatesToPosition(row: number, col: number): string {
    const file = String.fromCharCode(97 + col);
    const rank = 8 - row;
    return `${file}${rank}`;
  }

  /**
   * Evalúa la calidad de un movimiento
   */
  private evaluateMove(board: ChessSquare[][], from: string, to: string): number {
    let score = 0;
    
    const targetPiece = this.getPieceAtPosition(board, to);
    
    // Bonificación por capturar piezas
    if (targetPiece) {
      const pieceValues = {
        [PieceType.Pawn]: 1,
        [PieceType.Knight]: 3,
        [PieceType.Bishop]: 3,
        [PieceType.Rook]: 5,
        [PieceType.Queen]: 9,
        [PieceType.King]: 100
      };
      score += pieceValues[targetPiece.type] || 0;
    }
    
    // Aleatoriedad para variabilidad
    score += Math.random() * 0.5;
    
    return score;
  }

  /**
   * Utilidades auxiliares
   */
  private positionToCoordinates(position: string): { row: number; col: number } {
    const file = position.charCodeAt(0) - 97;
    const rank = parseInt(position.charAt(1)) - 1;
    return { row: 7 - rank, col: file };
  }

  private getPieceAtPosition(board: ChessSquare[][], position: string): ChessPiece | null {
    const square = this.getSquareAtPosition(board, position);
    return square ? square.piece : null;
  }

  private getSquareAtPosition(board: ChessSquare[][], position: string): ChessSquare | null {
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
