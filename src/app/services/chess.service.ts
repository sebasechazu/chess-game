import { Injectable, signal } from '@angular/core';
import { ChessPiece } from '../interfaces/chess-piece.interface';
import { ChessSquare } from '../interfaces/chess-square.interface';



@Injectable({ providedIn: 'root' })
export class ChessService {

  board = signal<ChessSquare[][]>([]);
  currentTurn = signal<'white' | 'black'>('white');
  gameOver = signal<boolean>(false);
  winnerColor = signal<'white' | 'black' | 'draw' | null>(null);
  showVictoryModal = signal<boolean>(false);
  gameInitialized = signal<boolean>(false);
  showInitialAnimations = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  moveHistory = signal<string[]>([]);
  totalMovements = signal<number>(0);
  whiteCaptures = signal<number>(0);
  blackCaptures = signal<number>(0);

  // Inicializa el juego
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
          color: (row + col) % 2 === 0 ? 'light' : 'dark',
          piece: null
        });
      }
      newBoard.push(boardRow);
    }
    this.setupInitialPosition(newBoard);
    this.board.set(newBoard);
    this.currentTurn.set('white');
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

  // Configura la posición inicial de las piezas
  private setupInitialPosition(board: ChessSquare[][]): void {
    this.placePiece(board, 'a1', { id: 1, type: 'rook', color: 'white', position: 'a1' });
    this.placePiece(board, 'b1', { id: 2, type: 'knight', color: 'white', position: 'b1' });
    this.placePiece(board, 'c1', { id: 3, type: 'bishop', color: 'white', position: 'c1' });
    this.placePiece(board, 'd1', { id: 4, type: 'queen', color: 'white', position: 'd1' });
    this.placePiece(board, 'e1', { id: 5, type: 'king', color: 'white', position: 'e1' });
    this.placePiece(board, 'f1', { id: 6, type: 'bishop', color: 'white', position: 'f1' });
    this.placePiece(board, 'g1', { id: 7, type: 'knight', color: 'white', position: 'g1' });
    this.placePiece(board, 'h1', { id: 8, type: 'rook', color: 'white', position: 'h1' });
    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      this.placePiece(board, `${file}2`, {
        id: 9 + col,
        type: 'pawn',
        color: 'white',
        position: `${file}2`
      });
    }
    this.placePiece(board, 'a8', { id: 17, type: 'rook', color: 'black', position: 'a8' });
    this.placePiece(board, 'b8', { id: 18, type: 'knight', color: 'black', position: 'b8' });
    this.placePiece(board, 'c8', { id: 19, type: 'bishop', color: 'black', position: 'c8' });
    this.placePiece(board, 'd8', { id: 20, type: 'queen', color: 'black', position: 'd8' });
    this.placePiece(board, 'e8', { id: 21, type: 'king', color: 'black', position: 'e8' });
    this.placePiece(board, 'f8', { id: 22, type: 'bishop', color: 'black', position: 'f8' });
    this.placePiece(board, 'g8', { id: 23, type: 'knight', color: 'black', position: 'g8' });
    this.placePiece(board, 'h8', { id: 24, type: 'rook', color: 'black', position: 'h8' });
    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      this.placePiece(board, `${file}7`, {
        id: 25 + col,
        type: 'pawn',
        color: 'black',
        position: `${file}7`
      });
    }
  }

  // Coloca una pieza en el tablero
  private placePiece(board: ChessSquare[][], position: string, piece: ChessPiece): void {
    const [file, rank] = position.split('');
    const col = file.charCodeAt(0) - 97;
    const row = 8 - parseInt(rank);
    if (board[row] && board[row][col]) {
      board[row][col].piece = piece;
    }
  }

  // Verifica si un movimiento es legal
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

  // Mueve una pieza en el tablero
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
    }
  }

  // Genera la notación del movimiento
  generateMoveNotation(piece: ChessPiece, sourcePos: string, targetPos: string, capturedPiece: ChessPiece | null): string {
    const pieceSymbols: Record<string, string> = {
      'king': 'K',
      'queen': 'Q',
      'rook': 'R',
      'bishop': 'B',
      'knight': 'N',
      'pawn': ''
    };
    const symbol = pieceSymbols[piece.type];
    const capture = capturedPiece ? 'x' : '';
    return `${symbol}${sourcePos}${capture}${targetPos}`;
  }

  // Verifica el estado del juego
  checkGameStatus(): void {
    const currentBoard = this.board();
    let whiteKingExists = false;
    let blackKingExists = false;
    for (const row of currentBoard) {
      for (const square of row) {
        if (square.piece?.type === 'king') {
          if (square.piece.color === 'white') {
            whiteKingExists = true;
          } else {
            blackKingExists = true;
          }
        }
      }
    }
    if (!whiteKingExists) {
      this.gameOver.set(true);
      this.winnerColor.set('black');
      this.showVictoryModal.set(true);
    } else if (!blackKingExists) {
      this.gameOver.set(true);
      this.winnerColor.set('white');
      this.showVictoryModal.set(true);
    }
  }
}
