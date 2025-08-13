import { ChessSquare, ChessPiece, PieceType } from './interfaces';

export function isValidPawnMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  // Implementación básica: solo avance de 1 casilla hacia adelante
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  const direction = piece.color === 'white' ? -1 : 1;
  // Movimiento simple
  if (srcCol === tgtCol && tgtRow - srcRow === direction && !board[tgtRow][tgtCol].piece) {
    return true;
  }
  // Captura diagonal
  if (Math.abs(srcCol - tgtCol) === 1 && tgtRow - srcRow === direction && board[tgtRow][tgtCol].piece) {
    return true;
  }
  return false;
}

export function isValidRookMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  // Movimiento horizontal o vertical sin piezas en el camino
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
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

// Puedes agregar funciones para Knight, Bishop, Queen, King...
export function isValidKnightMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);
  // Movimiento en L: 2x1 o 1x2
  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

export function isValidBishopMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);
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
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);
  // Movimiento de una casilla en cualquier dirección
  return rowDiff <= 1 && colDiff <= 1;
}
