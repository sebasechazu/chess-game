import { ChessSquare, ChessPiece, PieceType, PieceColor } from './interfaces';

/**
 * Valida si las coordenadas están dentro del tablero
 */
function isValidCoordinates(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function isValidPawnMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  // Validar límites del tablero
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  
  const direction = piece.color === PieceColor.White ? -1 : 1;
  const startingRow = piece.color === PieceColor.White ? 6 : 1;
  
  // Movimiento simple de 1 casilla
  if (srcCol === tgtCol && tgtRow - srcRow === direction && !board[tgtRow][tgtCol].piece) {
    return true;
  }
  
  // Movimiento inicial de 2 casillas
  if (srcCol === tgtCol && srcRow === startingRow && tgtRow - srcRow === direction * 2 && 
      !board[tgtRow][tgtCol].piece && !board[srcRow + direction][srcCol].piece) {
    return true;
  }
  
  // Captura diagonal
  if (Math.abs(srcCol - tgtCol) === 1 && tgtRow - srcRow === direction && board[tgtRow][tgtCol].piece) {
    return true;
  }
  
  return false;
}

export function isValidRookMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  // Validar límites del tablero
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  
  // Debe moverse horizontal o verticalmente
  if (srcRow !== tgtRow && srcCol !== tgtCol) return false;
  // Verificar que no haya piezas en el camino
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

export function isValidKnightMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  // Validar límites del tablero
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);
  // Movimiento en L: 2x1 o 1x2
  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

export function isValidBishopMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  // Validar límites del tablero
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);
  // Debe moverse diagonalmente
  if (rowDiff !== colDiff) return false;
  // Verificar que no haya piezas en el camino
  const rowStep = tgtRow > srcRow ? 1 : -1;
  const colStep = tgtCol > srcCol ? 1 : -1;
  for (let i = 1; i < rowDiff; i++) {
    if (board[srcRow + i * rowStep][srcCol + i * colStep].piece) return false;
  }
  return true;
}

export function isValidQueenMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  // La reina combina torre y alfil
  return isValidRookMove(board, piece, source, target) || isValidBishopMove(board, piece, source, target);
}

export function isValidKingMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  // Validar límites del tablero
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);
  // Movimiento de una casilla en cualquier dirección
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}
