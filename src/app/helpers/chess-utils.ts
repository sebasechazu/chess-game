/**
 * Funciones de utilidad específicas para la UI y lógica del juego
 * Este archivo mantiene solo las funciones que no están en los módulos core
 */

import { ChessSquare, ChessPiece, PieceType, Position, SquareColor, PIECE_SYMBOLS } from './interfaces';
import { coordinatesToPosition, getSquareAtPosition } from './chess-basic-validation';

export {
  positionToCoordinates,
  coordinatesToPosition,
  getPieceAtPosition,
  getSquareAtPosition,
  isValidCoordinates
} from './chess-basic-validation';

export {
  deepCloneBoard,
  getPieceValue,
  getAllPiecesForColor,
  findKings,
  hasBoardChanged,
  simulateMove,
  findKingPosition,
  countMaterial,
  getCenterPositionBonus
} from './chess-core-utils';

/**
 * Coloca una pieza en el tablero
 * @param board - Tablero actual
 * @param position - Posición donde colocar la pieza
 * @param piece - Pieza a colocar
 * @returns Verdadero si se colocó exitosamente
 */
export function placePiece(board: ChessSquare[][], position: Position, piece: ChessPiece): boolean {
  const square = getSquareAtPosition(board, position);
  if (!square) return false;
  
  square.piece = piece;
  return true;
}

/**
 * Genera la notación algebraica de un movimiento
 */
export function generateMoveNotation(
  piece: ChessPiece, 
  sourcePos: Position, 
  targetPos: Position, 
  capturedPiece: ChessPiece | null
): string {
  const symbol = PIECE_SYMBOLS[piece.type];
  const capture = capturedPiece ? 'x' : '';
  return `${symbol}${sourcePos}${capture}${targetPos}`;
}

/**
 * Crea un tablero vacío de ajedrez
 * @returns Tablero de 8x8 inicializado con casillas vacías
 */
const BOARD_SIZE = 8;
export function createEmptyBoard(): ChessSquare[][] {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      position: coordinatesToPosition(row, col),
      color: (row + col) % 2 === 0 ? SquareColor.Light : SquareColor.Dark,
      piece: null
    }))
  );
}

/**
 * Orden estándar de piezas en la primera fila
 */
export const INITIAL_PIECE_ORDER = [
  PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen, 
  PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook
] as const;