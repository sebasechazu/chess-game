/**
 * Reglas de movimiento específicas para cada pieza de ajedrez
 * Contiene las funciones de validación para todos los tipos de piezas
 */

import { ChessSquare, ChessPiece, PieceType, PieceColor } from './interfaces';
import { isValidCoordinates } from './chess-utils';

/**
 * Verifica si un movimiento de peón es válido
 * @param board - Tablero actual
 * @param piece - Pieza a mover
 * @param source - Coordenadas de origen [fila, columna]
 * @param target - Coordenadas de destino [fila, columna]
 * @returns Verdadero si el movimiento es válido, falso en caso contrario
 */
export function isValidPawnMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  if (srcRow === tgtRow && srcCol === tgtCol) return false;
  
  const direction = piece.color === PieceColor.White ? -1 : 1;
  const startingRow = piece.color === PieceColor.White ? 6 : 1;
  
  if (srcCol === tgtCol && tgtRow - srcRow === direction && !board[tgtRow][tgtCol].piece) {
    return true;
  }
  
  if (srcCol === tgtCol && srcRow === startingRow && tgtRow - srcRow === direction * 2 && 
      !board[tgtRow][tgtCol].piece && !board[srcRow + direction][srcCol].piece) {
    return true;
  }
  
  if (Math.abs(srcCol - tgtCol) === 1 && tgtRow - srcRow === direction && board[tgtRow][tgtCol].piece) {
    return true;
  }
  
  return false;
}

/**
 * Verifica si un movimiento de torre es válido
 * @param board - Tablero actual
 * @param piece - Pieza a mover
 * @param source - Coordenadas de origen [fila, columna]
 * @param target - Coordenadas de destino [fila, columna]
 * @returns Verdadero si el movimiento es válido, falso en caso contrario
 */
export function isValidRookMove(board: ChessSquare[][], _piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  if (srcRow === tgtRow && srcCol === tgtCol) return false;
  if (srcRow !== tgtRow && srcCol !== tgtCol) return false;

  if (srcRow === tgtRow) {
    const min = Math.min(srcCol, tgtCol);
    const max = Math.max(srcCol, tgtCol);
    for (let c = min + 1; c < max; c++) {
      if (board[srcRow][c].piece) return false;
    }
  } else {
    const min = Math.min(srcRow, tgtRow);
    const max = Math.max(srcRow, tgtRow);
    for (let r = min + 1; r < max; r++) {
      if (board[r][srcCol].piece) return false;
    }
  }
  return true;
}

/**
 * Verifica si un movimiento de caballo es válido
 * @param board - Tablero actual
 * @param piece - Pieza a mover
 * @param source - Coordenadas de origen [fila, columna]
 * @param target - Coordenadas de destino [fila, columna]
 * @returns Verdadero si el movimiento es válido, falso en caso contrario
 */
export function isValidKnightMove(_board: ChessSquare[][], _piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;

  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  if (srcRow === tgtRow && srcCol === tgtCol) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);

  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

/**
 * Verifica si un movimiento de alfil es válido
 * @param board - Tablero actual
 * @param piece - Pieza a mover
 * @param source - Coordenadas de origen [fila, columna]
 * @param target - Coordenadas de destino [fila, columna]
 * @returns Verdadero si el movimiento es válido, falso en caso contrario
 */
export function isValidBishopMove(board: ChessSquare[][], _piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  if (srcRow === tgtRow && srcCol === tgtCol) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);

  if (rowDiff !== colDiff) return false;

  const rowStep = tgtRow > srcRow ? 1 : -1;
  const colStep = tgtCol > srcCol ? 1 : -1;
  for (let i = 1; i < rowDiff; i++) {
    if (board[srcRow + i * rowStep][srcCol + i * colStep].piece) return false;
  }
  return true;
}

/**
 * Verifica si un movimiento de reina es válido
 * @param board - Tablero actual
 * @param piece - Pieza a mover
 * @param source - Coordenadas de origen [fila, columna]
 * @param target - Coordenadas de destino [fila, columna]
 * @returns Verdadero si el movimiento es válido, falso en caso contrario
 */
export function isValidQueenMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  return isValidRookMove(board, piece, source, target) || isValidBishopMove(board, piece, source, target);
}

/**
 * Verifica si un movimiento de rey es válido
 * @param board - Tablero actual
 * @param piece - Pieza a mover
 * @param source - Coordenadas de origen [fila, columna]
 * @param target - Coordenadas de destino [fila, columna]
 * @returns Verdadero si el movimiento es válido, falso en caso contrario
 */
export function isValidKingMove(_board: ChessSquare[][], _piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  if (srcRow === tgtRow && srcCol === tgtCol) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);

  return rowDiff <= 1 && colDiff <= 1;
}
