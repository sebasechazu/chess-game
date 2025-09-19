/**
 * Funciones de utilidad compartidas para el juego de ajedrez
 * Pueden ser usadas tanto en el worker como en el servicio principal
 */

import { ChessSquare, ChessPiece, PieceColor, Position, PieceType, PIECE_VALUES } from './interfaces';
import { positionToCoordinates, coordinatesToPosition } from './chess-basic-validation';

/**
 * Clona profundamente el estado del tablero.
 * @param board - El estado actual del tablero.
 * @returns Una copia profunda del tablero.
 */
export function deepCloneBoard(board: ChessSquare[][]): ChessSquare[][] {
  return board.map(row => 
    row.map(square => ({ 
      ...square, 
      piece: square.piece ? { ...square.piece } : null 
    }))
  );
}

/**
 * Obtiene todas las piezas de un color específico en el tablero.
 * @param board - El estado actual del tablero.
 * @param color - El color de las piezas a buscar.
 * @returns Un array de posiciones de las piezas encontradas.
 */
export function getAllPiecesForColor(board: ChessSquare[][], color: PieceColor): Position[] {
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
 * Obtiene el valor material de una pieza
 * @param type - Tipo de pieza
 * @returns Valor numérico de la pieza
 */
export function getPieceValue(type: PieceType): number {
  return PIECE_VALUES[type] || 0;
}

/**
 * Simula un movimiento en el tablero sin modificar el original.
 * @param board - El estado actual del tablero.
 * @param from - La posición de origen del movimiento.
 * @param to - La posición de destino del movimiento.
 * @returns El nuevo estado del tablero después del movimiento.
 */
export function simulateMove(board: ChessSquare[][], from: Position, to: Position): ChessSquare[][] {
  const newBoard = deepCloneBoard(board);
  const fromCoords = positionToCoordinates(from);
  const toCoords = positionToCoordinates(to);
  
  const fromSquare = newBoard[fromCoords.row][fromCoords.col];
  const toSquare = newBoard[toCoords.row][toCoords.col];
  
  if (!fromSquare.piece) return newBoard;

  const piece = fromSquare.piece;
  
  toSquare.piece = { ...piece, position: to, hasMoved: true };
  fromSquare.piece = null;
  
  return newBoard;
}

/**
 * Genera un hash único para la posición actual del tablero usando un algoritmo simple.
 * @param board - El estado actual del tablero.
 * @returns Un hash único representando la posición del tablero.
 */
export function generateSimpleBoardHash(board: ChessSquare[][]): string {
  let hash = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece) {
        hash += `${piece.type[0]}${piece.color[0]}${row}${col}`;
      }
    }
  }
  return hash;
}

/**
 * Busca la posición del rey de un color específico
 * @param board - El estado actual del tablero
 * @param color - Color del rey a buscar
 * @returns La posición del rey o null si no se encuentra
 */
export function findKingPosition(board: ChessSquare[][], color: PieceColor): Position | null {
  for (const row of board) {
    for (const square of row) {
      if (square.piece?.type === PieceType.King && square.piece.color === color) {
        return square.position;
      }
    }
  }
  return null;
}

/**
 * Verifica si un tablero tiene ambos reyes
 * @param board - El estado actual del tablero
 * @returns Objeto indicando la presencia de cada rey
 */
export function findKings(board: ChessSquare[][]): { white: boolean; black: boolean } {
  let whiteKingExists = false;
  let blackKingExists = false;
  
  for (const row of board) {
    for (const square of row) {
      if (square.piece?.type === PieceType.King) {
        if (square.piece.color === PieceColor.White) {
          whiteKingExists = true;
        } else {
          blackKingExists = true;
        }
        
        if (whiteKingExists && blackKingExists) {
          break;
        }
      }
    }
  }
  
  return { white: whiteKingExists, black: blackKingExists };
}

/**
 * Calcula bonus por posición central
 * @param row - Fila de la pieza
 * @param col - Columna de la pieza
 * @returns Valor de bonus por posición central
 */
export function getCenterPositionBonus(row: number, col: number): number {
  const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  return Math.max(0, 3 - centerDistance * 0.1);
}

/**
 * Verifica si dos tableros son diferentes
 * @param board1 - Primer tablero
 * @param board2 - Segundo tablero
 * @returns true si los tableros son diferentes
 */
export function hasBoardChanged(board1: ChessSquare[][], board2: ChessSquare[][]): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece1 = board1[row]?.[col]?.piece;
      const piece2 = board2[row]?.[col]?.piece;
      
      if (!piece1 && !piece2) continue;
      if (!piece1 || !piece2) return true;
      if (piece1.id !== piece2.id || piece1.position !== piece2.position) return true;
    }
  }
  return false;
}

/**
 * Cuenta el material total de un color
 * @param board - El estado actual del tablero
 * @param color - Color de las piezas a contar
 * @returns Valor total del material
 */
export function countMaterial(board: ChessSquare[][], color: PieceColor): number {
  let total = 0;
  for (const row of board) {
    for (const square of row) {
      if (square.piece && square.piece.color === color) {
        total += getPieceValue(square.piece.type);
      }
    }
  }
  return total;
}