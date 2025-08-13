
/**
 * Interfaces, tipos y enums para el juego de ajedrez
 * Contiene todas las definiciones de tipos utilizadas en la aplicación
 */

/**
 * Tipos de piezas de ajedrez
 */
export enum PieceType {
  King = 'king',
  Queen = 'queen',
  Rook = 'rook',
  Bishop = 'bishop',
  Knight = 'knight',
  Pawn = 'pawn'
}

/**
 * Colores de las piezas de ajedrez
 */
export enum PieceColor {
  White = 'white',
  Black = 'black'
}

/**
 * Colores de las casillas del tablero
 */
export enum SquareColor {
  Light = 'light',
  Dark = 'dark'
}

/**
 * Representa una pieza de ajedrez
 */
export interface ChessPiece {
  id: number;
  type: PieceType;
  color: PieceColor;
  position: string;
  image?: string;
  hasMoved?: boolean;
}

/**
 * Representa una casilla del tablero de ajedrez
 */
export interface ChessSquare {
  position: string;
  color: SquareColor;
  piece: ChessPiece | null;
}

/**
 * Resultado de un movimiento de ajedrez
 */
export interface MoveResult {
  success: boolean;
  captured?: ChessPiece;
  error?: string;
  moveType?: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
}

/**
 * Movimiento generado por la IA
 */
export interface AiMove {
  from: string;
  to: string;
  score: number;
}

/**
 * Datos de un movimiento realizado
 */
export interface MoveData {
  sourcePos: string;
  targetPos: string;
  movedPiece: ChessPiece | null;
  capturedPiece: ChessPiece | null;
}

/**
 * Datos para el modal de la aplicación
 */
export interface ModalData {
  open: boolean;
  title: string;
  content: string;
}

/**
 * Estadísticas del juego actual
 */
export interface GameStats {
  totalMovements: number;
  whiteCaptures: number;
  blackCaptures: number;
  moveHistory: string[];
}

/**
 * Estado actual del juego
 */
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

/**
 * Tipos auxiliares
 */
export type Position = string;
export type Coordinates = { row: number; col: number };
export type WinnerType = PieceColor | 'draw' | null;

/**
 * Valores numéricos de las piezas para evaluación
 */
export const PIECE_VALUES = {
  [PieceType.Pawn]: 1,
  [PieceType.Knight]: 3,
  [PieceType.Bishop]: 3,
  [PieceType.Rook]: 5,
  [PieceType.Queen]: 9,
  [PieceType.King]: 100
} as const;

/**
 * Símbolos de notación algebraica para las piezas
 */
export const PIECE_SYMBOLS = {
  [PieceType.King]: 'K',
  [PieceType.Queen]: 'Q',
  [PieceType.Rook]: 'R',
  [PieceType.Bishop]: 'B',
  [PieceType.Knight]: 'N',
  [PieceType.Pawn]: ''
} as const;
