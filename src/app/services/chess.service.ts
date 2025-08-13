
import { Injectable, signal, computed, WritableSignal, effect } from '@angular/core';
import { ChessPiece, PieceType, PieceColor } from '../interfaces/chess-piece.interface';
import { ChessSquare, SquareColor } from '../interfaces/chess-square.interface';

@Injectable({ providedIn: 'root' })
export class ChessService {
  constructor() {
    // Efecto para verificar el estado del juego cuando cambia el tablero
    effect(() => {
      const currentBoard = this.board();
      if (!this.gameInitialized()) return;
      this.checkGameStatus();
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
    if (!this.showVictoryModal()) {
      return { open: false, title: '', content: '' };
    }
    let content = 'Partida en tablas';
    if (this.winnerColor() === PieceColor.White) {
      content = 'Ganan las blancas';
    } else if (this.winnerColor() === PieceColor.Black) {
      content = 'Ganan las negras';
    }
    return {
      open: true,
      title: '¡Partida finalizada!',
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
