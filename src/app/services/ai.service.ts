// Limitar la cantidad de movimientos evaluados por rama

// Mapas para convertir enums string a índices numéricos para Zobrist
const PIECE_TYPE_INDEX: Record<string, number> = {
  pawn: 0,
  knight: 1,
  bishop: 2,
  rook: 3,
  queen: 4,
  king: 5
};
const PIECE_COLOR_INDEX: Record<string, number> = {
  white: 0,
  black: 1
};
import { zobristTable } from '../helpers/zobrist';
import { Injectable } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PieceColor,
  ChessSquare,
  AiMove,
  Position,
  AiDifficulty
} from '../helpers/interfaces';
import {
  isValidPawnMove,
  isValidRookMove,
  isValidKnightMove,
  isValidBishopMove,
  isValidQueenMove,
  isValidKingMove,
  isValidCastlingMove
} from '../helpers/chess-rules';
import {
  positionToCoordinates,
  getSquareAtPosition,
  getPieceAtPosition,
  deepCloneBoard,
  getAllPiecesForColor,
  getPieceValue,
  getCenterPositionBonus
} from '../helpers/chess-utils';
// ...existing code...

/**
 * Servicio responsable únicamente de la lógica de IA (movimientos, heurísticas, búsqueda)
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private static readonly MAX_BRANCHING = 10;
  private aiMovesCache = new Map<string, Position[]>();
  // Tabla de transposición para cachear evaluaciones de tableros
  private transpositionTable = new Map<string, number>();

  constructor() {}

  public clearCache(): void {
  this.aiMovesCache.clear();
  this.transpositionTable.clear();
  }

  public findBestMove(board: ChessSquare[][], difficulty: AiDifficulty): AiMove | null {

    const blackPieces = getAllPiecesForColor(board, PieceColor.Black);
    const possibleMoves: AiMove[] = [];

    for (const piecePos of blackPieces) {
      const validMoves = this.getValidMovesForPieceWithRules(board, piecePos);
      for (const targetPos of validMoves) {
        const baseScore = this.evaluateMove(board, piecePos, targetPos, difficulty);
        possibleMoves.push({ from: piecePos, to: targetPos, score: baseScore });
      }
    }

    // Log diagnóstico: cantidad de piezas negras y movimientos posibles
    console.log('[AI] Piezas negras:', blackPieces);
    console.log('[AI] Movimientos posibles para negras:', possibleMoves.length, possibleMoves);

    if (possibleMoves.length === 0) {
      console.warn('[AI] No hay movimientos posibles para negras.');
      return null;
    }

    possibleMoves.sort((a, b) => b.score - a.score);

    // normalize difficulty to numeric level for searches/effects
    const diffLevel = typeof difficulty === 'number' ? difficulty : (
      difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4
    );

    // Profundidad máxima por dificultad (más baja para mejor rendimiento)
    const depthForLevel: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 3 };
    const depth = depthForLevel[diffLevel] || 2;

    if (diffLevel === 1) {
      const topN = Math.max(1, Math.floor(possibleMoves.length * 0.2));
      const slice = possibleMoves.slice(0, topN);
      return slice[Math.floor(Math.random() * slice.length)];
    }

    if (diffLevel === 2) {
      return possibleMoves[0];
    }

    // Hard / Very-hard: minimax con profundidad limitada y ramas limitadas
    let bestMove: AiMove | null = null;
    let bestScore = -Infinity;
    // Limitar cantidad de ramas a evaluar
  const limitedMoves = possibleMoves.slice(0, AiService.MAX_BRANCHING);
    for (const m of limitedMoves) {
      const nb = this.simulateMove(board, m.from, m.to);
      const score = this.minimaxAlphaBeta(nb, depth - 1, -Infinity, Infinity, false);
      const finalScore = score + m.score * 0.03;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMove = { ...m, score: finalScore };
      }
    }

    return bestMove || limitedMoves[0];
  }

  public getValidMovesForPieceWithRules(board: ChessSquare[][], position: Position): Position[] {
    const boardHash = this.generateBoardHash(board);
    const cacheKey = `${position}-${boardHash}`;

    if (this.aiMovesCache.has(cacheKey)) {
      return this.aiMovesCache.get(cacheKey)!;
    }

    const validMoves: Position[] = [];
    const piece = getPieceAtPosition(board, position);
    if (!piece) return validMoves;

    const fromCoords = positionToCoordinates(position);

    for (const row of board) {
      for (const square of row) {
        if (position === square.position) continue;
        const toCoords = positionToCoordinates(square.position);
        if (this.isValidMoveByRules(board, piece, [fromCoords.row, fromCoords.col], [toCoords.row, toCoords.col])) {
          validMoves.push(square.position);
        }
      }
    }

    if (this.aiMovesCache.size < 1000) {
      this.aiMovesCache.set(cacheKey, validMoves);
    }

    return validMoves;
  }

  // Hash Zobrist eficiente para el tablero
  private generateBoardHash(board: ChessSquare[][]): string {
    let hash = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = board[row][col];
        if (sq.piece) {
          const typeIdx = PIECE_TYPE_INDEX[sq.piece.type];
          const colorIdx = PIECE_COLOR_INDEX[sq.piece.color];
          const validType = typeof typeIdx === 'number' && typeIdx >= 0 && typeIdx < 6;
          const validColor = typeof colorIdx === 'number' && colorIdx >= 0 && colorIdx < 2;
          if (validType && validColor) {
            hash ^= zobristTable[row][col][typeIdx][colorIdx];
          } else {
            // Loguear el error para depuración
            console.warn('Zobrist: tipo o color inválido', { row, col, typeIdx, colorIdx, piece: sq.piece });
          }
        }
      }
    }
    // Retornar como string para compatibilidad con el cache
    return hash.toString(16);
  }

  private evaluateMove(board: ChessSquare[][], from: Position, to: Position, difficulty: AiDifficulty): number {
    let score = 0;

    const movingPiece = getPieceAtPosition(board, from);
    const targetPiece = getPieceAtPosition(board, to);
    if (!movingPiece) return score;

    if (targetPiece) {
      score += getPieceValue(targetPiece.type) * 10;
    }

    const toCoords = positionToCoordinates(to);
    if (movingPiece.type !== PieceType.King) {
      score += getCenterPositionBonus(toCoords) * 2;
    }

    // Bonificación especial para enroque
    if (movingPiece.type === PieceType.King) {
      const fromCoords = positionToCoordinates(from);
      const colDiff = Math.abs(toCoords.col - fromCoords.col);
      
      // Si el rey se mueve 2 casillas horizontalmente, es enroque
      if (colDiff === 2 && fromCoords.row === toCoords.row) {
        score += 8; // Bonificación alta para enroque por su valor estratégico
      } else {
        score -= 2; // Penalización por mover el rey sin enrocar
      }
    }

    const fromCoords = positionToCoordinates(from);
    if ((movingPiece.color === PieceColor.Black && fromCoords.row <= 1) ||
      (movingPiece.color === PieceColor.White && fromCoords.row >= 6)) {
      score += 1;
    }

    const diffLevel = typeof difficulty === 'number' ? difficulty : (
      difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4
    );
    const randMultiplier = diffLevel === 1 ? 1 : diffLevel === 2 ? 0.2 : 0;
    score += Math.random() * 0.5 * randMultiplier;

    return score;
  }

  private simulateMove(board: ChessSquare[][], from: Position, to: Position): ChessSquare[][] {
    const newBoard = deepCloneBoard(board);
    const fromSq = getSquareAtPosition(newBoard, from);
    const toSq = getSquareAtPosition(newBoard, to);
    if (!fromSq || !toSq || !fromSq.piece) return newBoard;

    const piece = fromSq.piece;
    
    // Verificar si es un movimiento de enroque
    if (piece.type === PieceType.King) {
      const fromCoords = positionToCoordinates(from);
      const toCoords = positionToCoordinates(to);
      const colDiff = Math.abs(toCoords.col - fromCoords.col);
      
      if (colDiff === 2 && fromCoords.row === toCoords.row) {
        // Es un enroque, también mover la torre
        const isKingSideCastling = toCoords.col > fromCoords.col;
        const rookFromCol = isKingSideCastling ? 7 : 0;
        const rookToCol = isKingSideCastling ? toCoords.col - 1 : toCoords.col + 1;
        
        const rookFromPos = `${String.fromCharCode(97 + rookFromCol)}${8 - fromCoords.row}`;
        const rookToPos = `${String.fromCharCode(97 + rookToCol)}${8 - toCoords.row}`;
        
        const rookFromSq = getSquareAtPosition(newBoard, rookFromPos);
        const rookToSq = getSquareAtPosition(newBoard, rookToPos);
        
        if (rookFromSq && rookToSq && rookFromSq.piece) {
          // Mover la torre
          rookToSq.piece = { ...rookFromSq.piece, position: rookToPos, hasMoved: true };
          rookFromSq.piece = null;
        }
      }
    }

    // Mover la pieza principal
    toSq.piece = { ...piece, position: to, hasMoved: true };
    fromSq.piece = null;
    
    return newBoard;
  }

  private isValidMoveByRules(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    const [toRow, toCol] = to;
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) return false;
    const targetPiece = board[toRow][toCol].piece;
    if (targetPiece && targetPiece.color === piece.color) return false;

    switch (piece.type) {
      case PieceType.Pawn:
        return isValidPawnMove(board, piece, from, to);
      case PieceType.Rook:
        return isValidRookMove(board, piece, from, to);
      case PieceType.Knight:
        return isValidKnightMove(board, piece, from, to);
      case PieceType.Bishop:
        return isValidBishopMove(board, piece, from, to);
      case PieceType.Queen:
        return isValidQueenMove(board, piece, from, to);
      case PieceType.King:
        return isValidKingMove(board, piece, from, to);
      default:
        return false;
    }
  }

  private minimaxAlphaBeta(board: ChessSquare[][], depth: number, alpha: number, beta: number, maximizingPlayer: boolean): number {
    // Hash del tablero y clave de cache
    const boardHash = this.generateBoardHash(board);
    const cacheKey = `${boardHash}|d${depth}|a${alpha}|b${beta}|m${maximizingPlayer ? 1 : 0}`;
    if (this.transpositionTable.has(cacheKey)) {
      return this.transpositionTable.get(cacheKey)!;
    }
    // --- Quiescence search ---
    const isCaptureMoveAvailable = (board: ChessSquare[][], color: PieceColor): boolean => {
      const pieces = getAllPiecesForColor(board, color);
      for (const p of pieces) {
        const moves = this.getValidMovesForPieceWithRules(board, p);
        for (const t of moves) {
          const target = getPieceAtPosition(board, t);
          if (target && target.color !== color) return true;
        }
      }
      return false;
    };

    // Evaluación optimizada del tablero: solo material y control de centro
    const evaluateBoard = (board: ChessSquare[][]): number => {
      let total = 0;
      let blackCenter = 0, whiteCenter = 0;
      const centerSquares = ['d4','e4','d5','e5'];
      for (const row of board) {
        for (const sq of row) {
          if (!sq.piece) continue;
          const val = getPieceValue(sq.piece.type);
          total += sq.piece.color === PieceColor.Black ? val : -val;
          if (centerSquares.includes(sq.position)) {
            if (sq.piece.color === PieceColor.Black) blackCenter += 1;
            else whiteCenter += 1;
          }
        }
      }
      // Solo ponderar material y centro
      total += (blackCenter - whiteCenter) * 0.5;
      return total;
    };

    // Ordenar movimientos: primero capturas y limitar cantidad de ramas
    const orderMoves = (moves: AiMove[], board: ChessSquare[][]): AiMove[] => {
      const sorted = moves.sort((a, b) => {
        const targetA = getPieceAtPosition(board, a.to);
        const targetB = getPieceAtPosition(board, b.to);
        const valA = targetA ? getPieceValue(targetA.type) : 0;
        const valB = targetB ? getPieceValue(targetB.type) : 0;
        return valB - valA;
      });
  return sorted.slice(0, AiService.MAX_BRANCHING);
    };

    // Quiescence search: solo expandir capturas si depth == 0 y hay capturas disponibles
    if (depth === 0) {
      let result: number;
      // Si hay capturas posibles, seguir expandiendo solo capturas
      const color = maximizingPlayer ? PieceColor.Black : PieceColor.White;
      if (isCaptureMoveAvailable(board, color)) {
        const moves: AiMove[] = [];
        const pieces = getAllPiecesForColor(board, color);
        for (const p of pieces) {
          const targets = this.getValidMovesForPieceWithRules(board, p);
          for (const t of targets) {
            const target = getPieceAtPosition(board, t);
            if (target && target.color !== color) {
              moves.push({ from: p, to: t, score: 0 });
            }
          }
        }
        const orderedMoves = orderMoves(moves, board);
        if (maximizingPlayer) {
          let value = -Infinity;
          for (const m of orderedMoves) {
            const nb = this.simulateMove(board, m.from, m.to);
            value = Math.max(value, this.minimaxAlphaBeta(nb, 0, alpha, beta, false));
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
          }
          result = value === -Infinity ? evaluateBoard(board) : value;
        } else {
          let value = Infinity;
          for (const m of orderedMoves) {
            const nb = this.simulateMove(board, m.from, m.to);
            value = Math.min(value, this.minimaxAlphaBeta(nb, 0, alpha, beta, true));
            beta = Math.min(beta, value);
            if (beta <= alpha) break;
          }
          result = value === Infinity ? evaluateBoard(board) : value;
        }
      } else {
        // Si no hay capturas, evaluar normalmente
        result = evaluateBoard(board);
      }
      this.transpositionTable.set(cacheKey, result);
      return result;
    }

    if (maximizingPlayer) {
      const moves: AiMove[] = [];
      const pieces = getAllPiecesForColor(board, PieceColor.Black);
      for (const p of pieces) {
        const targets = this.getValidMovesForPieceWithRules(board, p);
        for (const t of targets) moves.push({ from: p, to: t, score: 0 });
      }

      if (moves.length === 0) {
        const result = this.minimaxAlphaBeta(board, 0, alpha, beta, false);
        this.transpositionTable.set(cacheKey, result);
        return result;
      }

      const orderedMoves = orderMoves(moves, board);

      let value = -Infinity;
      for (const m of orderedMoves) {
        const nb = this.simulateMove(board, m.from, m.to);
        value = Math.max(value, this.minimaxAlphaBeta(nb, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      this.transpositionTable.set(cacheKey, value);
      return value;
    } else {
      const moves: AiMove[] = [];
      const pieces = getAllPiecesForColor(board, PieceColor.White);
      for (const p of pieces) {
        const targets = this.getValidMovesForPieceWithRules(board, p);
        for (const t of targets) moves.push({ from: p, to: t, score: 0 });
      }

      if (moves.length === 0) {
        const result = this.minimaxAlphaBeta(board, 0, alpha, beta, true);
        this.transpositionTable.set(cacheKey, result);
        return result;
      }

      const orderedMoves = orderMoves(moves, board);

      let value = Infinity;
      for (const m of orderedMoves) {
        const nb = this.simulateMove(board, m.from, m.to);
        value = Math.min(value, this.minimaxAlphaBeta(nb, depth - 1, alpha, beta, true));
        beta = Math.min(beta, value);
        if (beta <= alpha) break;
      }
      this.transpositionTable.set(cacheKey, value);
      return value;
    }
  }
}
