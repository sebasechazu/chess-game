/**
 * Módulo de evaluación de posiciones de ajedrez
 * Contiene toda la lógica para evaluar la calidad de una posición
 */

import { ChessSquare, PieceColor, PieceType, ChessPiece } from './interfaces';
import { POSITION_TABLES, EVALUATION_WEIGHTS, CHESS_BONUSES } from './chess-constants';
import { getPieceValue, getAllPiecesForColor } from './chess-core-utils';

/**
 * Evalúa la posición actual del tablero y asigna una puntuación.
 * Puntuación positiva favorece a las negras, negativa a las blancas.
 * @param board - El estado actual del tablero.
 * @returns La puntuación total de la posición.
 */
export function evaluateBoard(board: ChessSquare[][]): number {
  let materialScore = 0;
  let positionalScore = 0;
  let developmentScore = 0;
  let kingSafetyScore = 0;
  let pawnStructureScore = 0;

  // Evaluar cada casilla del tablero
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (!square.piece) continue;

      const piece = square.piece;
      const isWhite = piece.color === PieceColor.White;
      const multiplier = isWhite ? -1 : 1; // Negras positivo, blancas negativo

      // Puntuación de material
      materialScore += getPieceValue(piece.type) * multiplier * EVALUATION_WEIGHTS.MATERIAL;

      // Puntuación posicional
      const positionValue = getPositionalValue(piece.type, row, col, isWhite);
      positionalScore += positionValue * multiplier * EVALUATION_WEIGHTS.POSITION;

      // Bonificaciones específicas por tipo de pieza
      developmentScore += getDevelopmentScore(piece, row, col, isWhite) * multiplier * EVALUATION_WEIGHTS.DEVELOPMENT;
      kingSafetyScore += getKingSafetyScore(piece, row, col, isWhite) * multiplier * EVALUATION_WEIGHTS.KING_SAFETY;
      pawnStructureScore += getPawnStructureScore(board, piece, row, col, isWhite) * multiplier * EVALUATION_WEIGHTS.PAWN_STRUCTURE;
    }
  }

  return materialScore + positionalScore + developmentScore + kingSafetyScore + pawnStructureScore;
}

/**
 * Obtiene el valor posicional de una pieza según las tablas
 * @param pieceType - Tipo de pieza
 * @param row - Fila en el tablero
 * @param col - Columna en el tablero
 * @param isWhite - Si la pieza es blanca
 * @returns Valor posicional
 */
function getPositionalValue(pieceType: PieceType, row: number, col: number, isWhite: boolean): number {
  const table = POSITION_TABLES[pieceType];
  if (!table) return 0;
  
  // Para piezas blancas, invertir la tabla (las blancas empiezan desde abajo)
  const tableRow = isWhite ? 7 - row : row;
  return table[tableRow][col];
}

/**
 * Calcula puntuación de desarrollo de piezas
 * @param piece - Pieza a evaluar
 * @param row - Fila de la pieza
 * @param col - Columna de la pieza
 * @param isWhite - Si la pieza es blanca
 * @returns Puntuación de desarrollo
 */
function getDevelopmentScore(piece: ChessPiece, row: number, col: number, isWhite: boolean): number {
  let score = 0;
  
  // Penalizar caballos y alfiles que no han salido de su posición inicial
  if (piece.type === PieceType.Knight || piece.type === PieceType.Bishop) {
    const initialRow = isWhite ? 7 : 0;
    if (row === initialRow) {
      score -= CHESS_BONUSES.DEVELOPMENT_BONUS;
    } else {
      score += CHESS_BONUSES.DEVELOPMENT_BONUS;
    }
  }
  
  return score;
}

/**
 * Evalúa la seguridad del rey
 * @param piece - Pieza a evaluar
 * @param row - Fila de la pieza
 * @param col - Columna de la pieza
 * @param isWhite - Si la pieza es blanca
 * @returns Puntuación de seguridad del rey
 */
function getKingSafetyScore(piece: ChessPiece, row: number, col: number, isWhite: boolean): number {
  if (piece.type !== PieceType.King) return 0;
  
  let score = 0;
  
  // Penalizar rey en el centro del tablero
  if (col >= 3 && col <= 4) {
    score -= CHESS_BONUSES.CENTER_KING_PENALTY;
  }
  
  // Bonificar enroque (rey en las esquinas en la fila inicial)
  if ((col === 6 || col === 2) && 
      ((isWhite && row === 7) || (!isWhite && row === 0))) {
    score += CHESS_BONUSES.CASTLING_BONUS;
  }
  
  return score;
}

/**
 * Evalúa la estructura de peones
 * @param board - Tablero actual
 * @param piece - Pieza a evaluar
 * @param row - Fila de la pieza
 * @param col - Columna de la pieza
 * @param isWhite - Si la pieza es blanca
 * @returns Puntuación de estructura de peones
 */
function getPawnStructureScore(board: ChessSquare[][], piece: ChessPiece, row: number, col: number, isWhite: boolean): number {
  if (piece.type !== PieceType.Pawn) return 0;
  
  let score = 0;
  
  // Penalizar peones doblados
  let doubledPawns = 0;
  for (let r = 0; r < 8; r++) {
    if (r !== row && board[r][col].piece?.type === PieceType.Pawn && 
        board[r][col].piece?.color === piece.color) {
      doubledPawns++;
    }
  }
  score -= doubledPawns * CHESS_BONUSES.DOUBLED_PAWN_PENALTY;
  
  // Penalizar peones aislados
  let isolatedPawn = true;
  for (let c = col - 1; c <= col + 1; c += 2) {
    if (c >= 0 && c < 8) {
      for (let r = 0; r < 8; r++) {
        if (board[r][c].piece?.type === PieceType.Pawn && 
            board[r][c].piece?.color === piece.color) {
          isolatedPawn = false;
          break;
        }
      }
    }
  }
  if (isolatedPawn) {
    score -= CHESS_BONUSES.ISOLATED_PAWN_PENALTY;
  }
  
  return score;
}

/**
 * Evalúa si una posición es tácticamente activa (para quiescence search)
 * @param board - Tablero actual
 * @param color - Color del jugador
 * @returns true si hay capturas disponibles
 */
export function hasCaptures(board: ChessSquare[][], color: PieceColor): boolean {
  const pieces = getAllPiecesForColor(board, color);
  
  for (const piecePos of pieces) {
    // Esta función requeriría importar getValidMovesForPiece
    // Por simplicidad, retornamos true si hay piezas enemigas en el tablero
    for (const row of board) {
      for (const square of row) {
        if (square.piece && square.piece.color !== color) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Evaluación rápida para quiescence search
 * @param board - Tablero actual
 * @returns Evaluación básica material + posicional
 */
export function quickEvaluate(board: ChessSquare[][]): number {
  let score = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece;
      if (!piece) continue;
      
      const multiplier = piece.color === PieceColor.White ? -1 : 1;
      score += getPieceValue(piece.type) * multiplier;
    }
  }
  
  return score;
}