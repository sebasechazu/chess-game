import { Injectable, signal, computed } from '@angular/core';
import { ChessPiece, PieceType, PieceColor } from '../interfaces/chess-piece.interface';
import { ChessSquare, SquareColor } from '../interfaces/chess-square.interface';

@Injectable({ providedIn: 'root' })
export class ChessService {

  /**
   * Estado del tablero
   */
  public readonly board = signal<ChessSquare[][]>([]);
  public readonly currentTurn = signal<PieceColor>(PieceColor.White);
  public readonly gameOver = signal<boolean>(false);
  public readonly winnerColor = signal<PieceColor | 'draw' | null>(null);
  public readonly showVictoryModal = signal<boolean>(false);
  public readonly gameInitialized = signal<boolean>(false);
  public readonly showInitialAnimations = signal<boolean>(false);
  public readonly isLoading = signal<boolean>(true);
  public readonly moveHistory = signal<string[]>([]);
  public readonly totalMovements = signal<number>(0);
  public readonly whiteCaptures = signal<number>(0);
  public readonly blackCaptures = signal<number>(0);
  
  /**
   * Estado derivado: ¿el juego está activo?
   */
  public readonly isGameActive = computed(() => this.gameInitialized() && !this.gameOver());

  /**
   * Inicializa el juego
   */
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
  this.currentTurn.set(PieceColor.White);
    this.gameOver.set(false);
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

  /**
   * Configura la posición inicial de las piezas
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

  /**
   * Coloca una pieza en el tablero
   */
  private placePiece(board: ChessSquare[][], position: string, piece: ChessPiece): void {
    const [file, rank] = position.split('');
    const col = file.charCodeAt(0) - 97;
    const row = 8 - parseInt(rank);
    if (board[row] && board[row][col]) {
      board[row][col].piece = piece;
    }
  }

  /**
   * Verifica si un movimiento es legal
   */
  isLegalMove(board: ChessSquare[][], sourcePos: string, targetPos: string): boolean {
    const [sourceFile, sourceRank] = sourcePos.split('');
    const sourceCol = sourceFile.charCodeAt(0) - 97;
    const sourceRow = 8 - parseInt(sourceRank);
    const [targetFile, targetRank] = targetPos.split('');
    const targetCol = targetFile.charCodeAt(0) - 97;
    const targetRow = 8 - parseInt(targetRank);
    const piece = board[sourceRow][sourceCol].piece;
    const targetSquare = board[targetRow][targetCol];
    if (targetSquare.piece && targetSquare.piece.color === piece?.color) {
      return false;
    }
    return true;
  }

  /**
   * Realiza el movimiento de una pieza y actualiza el historial y capturas
   */
  movePiece(board: ChessSquare[][], sourcePos: string, targetPos: string): void {
    const [sourceFile, sourceRank] = sourcePos.split('');
    const sourceCol = sourceFile.charCodeAt(0) - 97;
    const sourceRow = 8 - parseInt(sourceRank);
    const [targetFile, targetRank] = targetPos.split('');
    const targetCol = targetFile.charCodeAt(0) - 97;
    const targetRow = 8 - parseInt(targetRank);
    const piece = board[sourceRow][sourceCol].piece;
    if (piece) {
      const newPiece = { ...piece, position: targetPos, hasMoved: true };
      const capturedPiece = board[targetRow][targetCol].piece;
      const moveNotation = this.generateMoveNotation(newPiece, sourcePos, targetPos, capturedPiece);
      this.moveHistory.update(history => [...history, moveNotation]);
      board[targetRow][targetCol].piece = newPiece;
      board[sourceRow][sourceCol].piece = null;
      // Actualiza contadores de capturas
      if (capturedPiece) {
        if (capturedPiece.color === PieceColor.White) {
          this.whiteCaptures.update(c => c + 1);
        } else {
          this.blackCaptures.update(c => c + 1);
        }
      }
      this.totalMovements.update(m => m + 1);
    }
  }

  /**
   * Genera la notación del movimiento
   */
  generateMoveNotation(piece: ChessPiece, sourcePos: string, targetPos: string, capturedPiece: ChessPiece | null): string {
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
   * Verifica el estado del juego
   */
  checkGameStatus(): void {
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
      this.showVictoryModal.set(true);
    } else if (!blackKingExists) {
      this.gameOver.set(true);
  this.winnerColor.set(PieceColor.White);
      this.showVictoryModal.set(true);
    }
  }
}
