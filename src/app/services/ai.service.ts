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
  isValidKingMove
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

/**
 * Servicio responsable únicamente de la lógica de IA (movimientos, heurísticas, búsqueda)
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private aiMovesCache = new Map<string, Position[]>();

  constructor() {}

  public clearCache(): void {
    this.aiMovesCache.clear();
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

    if (possibleMoves.length === 0) return null;

    possibleMoves.sort((a, b) => b.score - a.score);

    // normalize difficulty to numeric level for searches/effects
    const diffLevel = typeof difficulty === 'number' ? difficulty : (
      difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4
    );

    if (diffLevel === 1) {
      const topN = Math.max(1, Math.floor(possibleMoves.length * 0.2));
      const slice = possibleMoves.slice(0, topN);
      return slice[Math.floor(Math.random() * slice.length)];
    }

    if (diffLevel === 2) {
      return possibleMoves[0];
    }

    // Hard / Very-hard: minimax with alpha-beta
    let bestMove: AiMove | null = null;
    let bestScore = -Infinity;
  const depthForLevel: Record<number, number> = { 3: 3, 4: 4 };
  const depth = depthForLevel[diffLevel] || 3;

    for (const m of possibleMoves) {
      const nb = this.simulateMove(board, m.from, m.to);
  const score = this.minimaxAlphaBeta(nb, depth - 1, -Infinity, Infinity, false);
      const finalScore = score + m.score * 0.03;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMove = { ...m, score: finalScore };
      }
    }

    return bestMove || possibleMoves[0];
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

  private generateBoardHash(board: ChessSquare[][]): string {
    let seed = '';
    for (const row of board) {
      for (const square of row) {
        seed += square.piece ? `${square.piece.type}:${square.piece.color}:${square.position};` : '0;';
      }
    }
    let h = 5381;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) + h) + seed.charCodeAt(i);
      h = h | 0;
    }
    const hex = (h >>> 0).toString(16);
    const readable = seed.slice(0, 40).replace(/;/g, '|');
    return `${hex}-${readable}`;
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

    if (movingPiece.type === PieceType.King) score -= 2;

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

    toSq.piece = { ...fromSq.piece, position: to };
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
    if (depth === 0) {
      let total = 0;
      for (const row of board) {
        for (const sq of row) {
          if (!sq.piece) continue;
          const val = getPieceValue(sq.piece.type);
          total += sq.piece.color === PieceColor.Black ? val : -val;
        }
      }
      return total;
    }

    if (maximizingPlayer) {
      const moves: AiMove[] = [];
      const pieces = getAllPiecesForColor(board, PieceColor.Black);
      for (const p of pieces) {
        const targets = this.getValidMovesForPieceWithRules(board, p);
        for (const t of targets) moves.push({ from: p, to: t, score: 0 });
      }

      if (moves.length === 0) return this.minimaxAlphaBeta(board, 0, alpha, beta, false);

      let value = -Infinity;
      for (const m of moves) {
        const nb = this.simulateMove(board, m.from, m.to);
        value = Math.max(value, this.minimaxAlphaBeta(nb, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    } else {
      const moves: AiMove[] = [];
      const pieces = getAllPiecesForColor(board, PieceColor.White);
      for (const p of pieces) {
        const targets = this.getValidMovesForPieceWithRules(board, p);
        for (const t of targets) moves.push({ from: p, to: t, score: 0 });
      }

      if (moves.length === 0) return this.minimaxAlphaBeta(board, 0, alpha, beta, true);

      let value = Infinity;
      for (const m of moves) {
        const nb = this.simulateMove(board, m.from, m.to);
        value = Math.min(value, this.minimaxAlphaBeta(nb, depth - 1, alpha, beta, true));
        beta = Math.min(beta, value);
        if (beta <= alpha) break;
      }
      return value;
    }
  }
}
