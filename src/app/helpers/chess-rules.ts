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
export function isValidKingMove(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  if (!isValidCoordinates(tgtRow, tgtCol)) return false;
  if (srcRow === tgtRow && srcCol === tgtCol) return false;
  
  const rowDiff = Math.abs(srcRow - tgtRow);
  const colDiff = Math.abs(srcCol - tgtCol);

  // Movimiento normal del rey (una casilla en cualquier dirección)
  if (rowDiff <= 1 && colDiff <= 1) {
    return true;
  }

  // Verificar si es un intento de enroque (movimiento de 2 casillas horizontalmente)
  if (rowDiff === 0 && colDiff === 2) {
    return isValidCastlingMove(board, piece, source, target);
  }

  return false;
}

/**
 * Verifica si un movimiento de enroque es válido
 * @param board - Tablero actual
 * @param king - Rey que intenta enrocar
 * @param source - Coordenadas de origen del rey [fila, columna]
 * @param target - Coordenadas de destino del rey [fila, columna]
 * @returns Verdadero si el enroque es válido, falso en caso contrario
 */
export function isValidCastlingMove(board: ChessSquare[][], king: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;

  // El enroque solo es válido si el rey no ha movido
  if (king.hasMoved) return false;

  // Determinar si es enroque corto (lado del rey) o largo (lado de la reina)
  const isKingSideCastling = tgtCol > srcCol;
  const rookCol = isKingSideCastling ? 7 : 0;
  const rook = board[srcRow][rookCol].piece;

  // Verificar que la torre existe, es del mismo color y no ha movido
  if (!rook || rook.type !== PieceType.Rook || rook.color !== king.color || rook.hasMoved) {
    return false;
  }

  // Verificar que las casillas entre el rey y la torre están vacías
  const startCol = Math.min(srcCol, rookCol);
  const endCol = Math.max(srcCol, rookCol);
  for (let col = startCol + 1; col < endCol; col++) {
    if (board[srcRow][col].piece) return false;
  }

  // Verificar que el rey no está en jaque en la posición inicial
  if (isKingInCheck(board, king.color)) return false;

  // Verificar que el rey no pasa por una casilla atacada
  const stepCol = isKingSideCastling ? srcCol + 1 : srcCol - 1;
  if (isSquareUnderAttack(board, [srcRow, stepCol], king.color)) return false;

  // Verificar que el rey no termina en jaque en la posición final
  if (isSquareUnderAttack(board, [tgtRow, tgtCol], king.color)) return false;

  return true;
}

/**
 * Verifica si un rey está en jaque
 * @param board - Tablero actual
 * @param kingColor - Color del rey a verificar
 * @returns Verdadero si el rey está en jaque, falso en caso contrario
 */
export function isKingInCheck(board: ChessSquare[][], kingColor: PieceColor): boolean {
  // Encontrar la posición del rey
  let kingPosition: [number, number] | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece && piece.type === PieceType.King && piece.color === kingColor) {
        kingPosition = [row, col];
        break;
      }
    }
    if (kingPosition) break;
  }

  if (!kingPosition) return false;

  return isSquareUnderAttack(board, kingPosition, kingColor);
}

/**
 * Verifica si una casilla está siendo atacada por piezas del color opuesto
 * @param board - Tablero actual
 * @param square - Coordenadas de la casilla [fila, columna]
 * @param defenderColor - Color de la pieza que defiende la casilla
 * @returns Verdadero si la casilla está bajo ataque, falso en caso contrario
 */
export function isSquareUnderAttack(board: ChessSquare[][], square: [number, number], defenderColor: PieceColor): boolean {
  const [targetRow, targetCol] = square;
  const attackerColor = defenderColor === PieceColor.White ? PieceColor.Black : PieceColor.White;

  // Verificar ataques de todas las piezas del color opuesto
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (!piece || piece.color !== attackerColor) continue;

      // Verificar si esta pieza puede atacar la casilla objetivo
      if (canPieceAttackSquare(board, piece, [row, col], [targetRow, targetCol])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verifica si una pieza puede atacar una casilla específica
 * @param board - Tablero actual
 * @param piece - Pieza atacante
 * @param source - Coordenadas de la pieza atacante [fila, columna]
 * @param target - Coordenadas de la casilla objetivo [fila, columna]
 * @returns Verdadero si la pieza puede atacar la casilla, falso en caso contrario
 */
function canPieceAttackSquare(board: ChessSquare[][], piece: ChessPiece, source: [number, number], target: [number, number]): boolean {
  switch (piece.type) {
    case PieceType.Pawn:
      return canPawnAttackSquare(piece, source, target);
    case PieceType.Rook:
      return isValidRookMove(board, piece, source, target);
    case PieceType.Knight:
      return isValidKnightMove(board, piece, source, target);
    case PieceType.Bishop:
      return isValidBishopMove(board, piece, source, target);
    case PieceType.Queen:
      return isValidQueenMove(board, piece, source, target);
    case PieceType.King:
      // Para el rey, solo verificamos movimientos normales (no enroque)
      const [srcRow, srcCol] = source;
      const [tgtRow, tgtCol] = target;
      const rowDiff = Math.abs(srcRow - tgtRow);
      const colDiff = Math.abs(srcCol - tgtCol);
      return rowDiff <= 1 && colDiff <= 1;
    default:
      return false;
  }
}

/**
 * Verifica si un peón puede atacar una casilla específica
 * @param pawn - Peón atacante
 * @param source - Coordenadas del peón [fila, columna]
 * @param target - Coordenadas de la casilla objetivo [fila, columna]
 * @returns Verdadero si el peón puede atacar la casilla, falso en caso contrario
 */
function canPawnAttackSquare(pawn: ChessPiece, source: [number, number], target: [number, number]): boolean {
  const [srcRow, srcCol] = source;
  const [tgtRow, tgtCol] = target;
  
  const direction = pawn.color === PieceColor.White ? -1 : 1;
  
  // Los peones atacan en diagonal
  return Math.abs(srcCol - tgtCol) === 1 && tgtRow - srcRow === direction;
}
