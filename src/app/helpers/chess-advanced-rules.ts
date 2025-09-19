/**
 * Reglas avanzadas de ajedrez
 * Este archivo contiene funciones de juego más complejas como jaque, jaque mate, castling, etc.
 * Las validaciones básicas de movimiento están en chess-basic-validation.ts
 */

import { ChessSquare, ChessPiece, PieceType, PieceColor, Position } from './interfaces';
import { isValidCoordinates, coordinatesToPosition, isValidMove } from './chess-basic-validation';
import { deepCloneBoard, simulateMove } from './chess-core-utils';

/**
 * Verifica si el rey está en jaque
 */
export function isKingInCheck(board: ChessSquare[][], kingColor: PieceColor): boolean {
  // Encontrar el rey
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
  
  // Verificar si alguna pieza enemiga puede atacar al rey
  const enemyColor = kingColor === PieceColor.White ? PieceColor.Black : PieceColor.White;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece && piece.color === enemyColor) {
        if (isValidMove(board, piece, [row, col], kingPosition)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Verifica si es jaque mate
 */
export function isCheckmate(board: ChessSquare[][], kingColor: PieceColor): boolean {
  if (!isKingInCheck(board, kingColor)) return false;
  
  // Verificar si hay algún movimiento legal que saque al rey del jaque
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece && piece.color === kingColor) {
        for (let targetRow = 0; targetRow < 8; targetRow++) {
          for (let targetCol = 0; targetCol < 8; targetCol++) {
            if (isValidMove(board, piece, [row, col], [targetRow, targetCol])) {
              // Simular el movimiento
              const newBoard = deepCloneBoard(board);
              newBoard[targetRow][targetCol].piece = piece;
              newBoard[row][col].piece = null;
              
              if (!isKingInCheck(newBoard, kingColor)) {
                return false; // Hay un movimiento legal
              }
            }
          }
        }
      }
    }
  }
  
  return true; // No hay movimientos legales
}

/**
 * Verifica si es empate por ahogado (stalemate)
 */
export function isStalemate(board: ChessSquare[][], playerColor: PieceColor): boolean {
  if (isKingInCheck(board, playerColor)) return false;
  
  // Verificar si hay algún movimiento legal
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece && piece.color === playerColor) {
        for (let targetRow = 0; targetRow < 8; targetRow++) {
          for (let targetCol = 0; targetCol < 8; targetCol++) {
            if (isValidMove(board, piece, [row, col], [targetRow, targetCol])) {
              // Simular el movimiento para asegurar que no deja al rey en jaque
              const newBoard = deepCloneBoard(board);
              newBoard[targetRow][targetCol].piece = piece;
              newBoard[row][col].piece = null;
              
              if (!isKingInCheck(newBoard, playerColor)) {
                return false; // Hay al menos un movimiento legal
              }
            }
          }
        }
      }
    }
  }
  
  return true; // No hay movimientos legales disponibles
}

/**
 * Verifica si un movimiento es legal (no deja al propio rey en jaque)
 */
export function isLegalMove(
  board: ChessSquare[][],
  piece: ChessPiece,
  from: [number, number],
  to: [number, number]
): boolean {
  // Primero verificar si es un movimiento básicamente válido
  if (!isValidMove(board, piece, from, to)) return false;
  
  // Simular el movimiento
  const newBoard = deepCloneBoard(board);
  newBoard[to[0]][to[1]].piece = piece;
  newBoard[from[0]][from[1]].piece = null;
  
  // Verificar que no deje al propio rey en jaque
  return !isKingInCheck(newBoard, piece.color);
}

/**
 * Obtiene todos los movimientos legales para una pieza
 */
export function getLegalMoves(
  board: ChessSquare[][],
  piece: ChessPiece,
  from: [number, number]
): Position[] {
  const legalMoves: Position[] = [];
  
  // Probar todos los movimientos posibles
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (isLegalMove(board, piece, from, [row, col])) {
        legalMoves.push(coordinatesToPosition(row, col));
      }
    }
  }
  
  return legalMoves;
}

/**
 * Verifica si el juego ha terminado
 */
export function isGameOver(board: ChessSquare[][], currentPlayer: PieceColor): {
  isOver: boolean;
  winner?: PieceColor;
  reason?: 'checkmate' | 'stalemate' | 'insufficient_material';
} {
  if (isCheckmate(board, currentPlayer)) {
    return {
      isOver: true,
      winner: currentPlayer === PieceColor.White ? PieceColor.Black : PieceColor.White,
      reason: 'checkmate'
    };
  }
  
  if (isStalemate(board, currentPlayer)) {
    return {
      isOver: true,
      reason: 'stalemate'
    };
  }
  
  return { isOver: false };
}