// ===== ENUMS =====

export enum PieceType {
  King = 'king',
  Queen = 'queen',
  Rook = 'rook',
  Bishop = 'bishop',
  Knight = 'knight',
  Pawn = 'pawn'
}

export enum PieceColor {
  White = 'white',
  Black = 'black'
}

export enum SquareColor {
  Light = 'light',
  Dark = 'dark'
}

// ===== INTERFACES PRINCIPALES =====

export interface ChessPiece {
  id: number;
  type: PieceType;
  color: PieceColor;
  position: string;
  image?: string;
  hasMoved?: boolean;
}

export interface ChessSquare {
  position: string;
  color: SquareColor;
  piece: ChessPiece | null;
}

// ===== INTERFACES DEL SERVICIO =====

export interface MoveResult {
  success: boolean;
  captured?: ChessPiece;
  error?: string;
  moveType?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
}

export interface AiMove {
  from: string;
  to: string;
  score: number;
}

export interface MoveData {
  sourcePos: string;
  targetPos: string;
  movedPiece: ChessPiece | null;
  capturedPiece: ChessPiece | null;
}

// ===== INTERFACES DE LA UI =====

export interface ModalData {
  open: boolean;
  title: string;
  content: string;
}

export interface GameStats {
  totalMovements: number;
  whiteCaptures: number;
  blackCaptures: number;
  moveHistory: string[];
}

export interface GameState {
  currentTurn: PieceColor;
  gameOver: boolean;
  winnerColor: PieceColor | 'draw' | null;
  gameInitialized: boolean;
  showVictoryModal: boolean;
  showInitialAnimations: boolean;
  isLoading: boolean;
  aiEnabled: boolean;
}

// ===== TYPES UTILITARIOS =====

export type Position = string; // e.g., "a1", "h8"
export type Coordinates = { row: number; col: number };
export type WinnerType = PieceColor | 'draw' | null;

// ===== CONSTANTES =====

export const PIECE_VALUES = {
  [PieceType.Pawn]: 1,
  [PieceType.Knight]: 3,
  [PieceType.Bishop]: 3,
  [PieceType.Rook]: 5,
  [PieceType.Queen]: 9,
  [PieceType.King]: 100
} as const;

export const PIECE_SYMBOLS = {
  [PieceType.King]: 'K',
  [PieceType.Queen]: 'Q',
  [PieceType.Rook]: 'R',
  [PieceType.Bishop]: 'B',
  [PieceType.Knight]: 'N',
  [PieceType.Pawn]: ''
} as const;
