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
 * Devuelve verdadero o falso
 */
export function isKingInCheck(board: ChessSquare[][], kingColor: PieceColor): boolean {
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
 * Devuelve verdadero o falso
 */
export function isCheckmate(board: ChessSquare[][], kingColor: PieceColor): boolean {
  if (!isKingInCheck(board, kingColor)) return false;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece && piece.color === kingColor) {
        for (let targetRow = 0; targetRow < 8; targetRow++) {
          for (let targetCol = 0; targetCol < 8; targetCol++) {
            if (isValidMove(board, piece, [row, col], [targetRow, targetCol])) {

              const newBoard = deepCloneBoard(board);
              newBoard[targetRow][targetCol].piece = piece;
              newBoard[row][col].piece = null;
              
              if (!isKingInCheck(newBoard, kingColor)) {
                return false; 
              }
            }
          }
        }
      }
    }
  }
  
  return true;
}

/**
 * Verifica si un movimiento específico resultaría en jaque mate para el oponente
 * Devuelve verdadero o falso
 */
export function wouldCauseCheckmate(
  board: ChessSquare[][], 
  piece: ChessPiece, 
  from: [number, number], 
  to: [number, number]
): boolean {
  const newBoard = deepCloneBoard(board);
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  newBoard[toRow][toCol].piece = piece;
  newBoard[fromRow][fromCol].piece = null;
  
  const opponentColor = piece.color === PieceColor.White ? PieceColor.Black : PieceColor.White;
  
  return isCheckmate(newBoard, opponentColor);
}

/**
 * Verifica si es empate por ahogado (stalemate)
 * Devuelve verdadero o falso
 */
export function isStalemate(board: ChessSquare[][], playerColor: PieceColor): boolean {
  if (isKingInCheck(board, playerColor)) return false;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (piece && piece.color === playerColor) {
        for (let targetRow = 0; targetRow < 8; targetRow++) {
          for (let targetCol = 0; targetCol < 8; targetCol++) {
            if (isValidMove(board, piece, [row, col], [targetRow, targetCol])) {
              const newBoard = deepCloneBoard(board);
              newBoard[targetRow][targetCol].piece = piece;
              newBoard[row][col].piece = null;
              
              if (!isKingInCheck(newBoard, playerColor)) {
                return false; 
              }
            }
          }
        }
      }
    }
  }
  
  return true;
}

/**
 * Verifica si un movimiento es legal (no deja al propio rey en jaque)
 * Devuelve verdadero o falso
 */
export function isLegalMove(
  board: ChessSquare[][],
  piece: ChessPiece,
  from: [number, number],
  to: [number, number]
): boolean {
  if (!isValidMove(board, piece, from, to)) return false;
  
  const newBoard = deepCloneBoard(board);
  newBoard[to[0]][to[1]].piece = piece;
  newBoard[from[0]][from[1]].piece = null;
  
  return !isKingInCheck(newBoard, piece.color);
}

/**
 * Obtiene todos los movimientos legales para una pieza
 * Devuelve una lista de posiciones legales
 */
export function getLegalMoves(
  board: ChessSquare[][],
  piece: ChessPiece,
  from: [number, number]
): Position[] {
  const legalMoves: Position[] = [];
  
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
 * Devuelve el ganador y la razón si es aplicable
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