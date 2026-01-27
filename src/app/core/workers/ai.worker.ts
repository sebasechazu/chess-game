/// <reference lib="webworker" />

import {
  ChessSquare,
  PieceColor,
  AiMove,
  Position
} from '../helpers/interfaces';

import {
  AI_CONFIG,
  PIECE_TYPE_INDEX,
  PIECE_COLOR_INDEX
} from '../helpers/chess-constants';

// Configuración dinámica de dificultad (puede ser sobrescrita)
let currentAiConfig = { ...AI_CONFIG };

// Control de tiempo para evitar bloqueos
let startTime = 0;
const MAX_CALCULATION_TIME = 25000; // 25 segundos máximo por cálculo

import {
  isValidMove,
  positionToCoordinates,
  coordinatesToPosition,
  getPieceAtPosition,
  getSquareAtPosition
} from '../helpers/chess-basic-validation';

import {
  deepCloneBoard,
  getAllPiecesForColor,
  getPieceValue,
  simulateMove
} from '../helpers/chess-core-utils';

import {
  evaluateBoard
} from '../helpers/chess-evaluation';

// Tabla Zobrist simplificada para el worker
const zobristTable: number[][][][] = [];

/**
 * Inicializa la tabla Zobrist con valores aleatorios.
 */
function initializeZobrist() {
  for (let row = 0; row < 8; row++) {
    zobristTable[row] = [];
    for (let col = 0; col < 8; col++) {
      zobristTable[row][col] = [];
      for (let piece = 0; piece < 6; piece++) {
        zobristTable[row][col][piece] = [];
        for (let color = 0; color < 2; color++) {
          zobristTable[row][col][piece][color] = Math.floor(Math.random() * 0x7FFFFFFF);
        }
      }
    }
  }
}

// Cache para movimientos y evaluaciones
const aiMovesCache = new Map<string, Position[]>();
const transpositionTable = new Map<string, { score: number; depth: number }>();

/**
 * Mensajes del worker.
 */
interface WorkerMessage {
  type: 'findBestMove' | 'evaluateMoves' | 'clearCache' | 'setDifficulty';
  board?: ChessSquare[][];
  moves?: AiMove[];
  difficulty?: {
    MAX_DEPTH: number;
    MAX_BRANCHING: number;
    QUIESCENCE_DEPTH: number;
  };
  messageId?: string;
}

/**
 * Respuesta del worker.
 */
interface WorkerResponse {
  type: 'bestMove' | 'bestMoves' | 'error';
  move?: AiMove | null;
  moves?: AiMove[];
  error?: string;
  messageId?: string;
}

/**
 * Genera un hash único para la posición actual del tablero usando Zobrist.
 * @param board - El estado actual del tablero.
 * @returns Un hash único representando la posición del tablero.
 */
function generateBoardHash(board: ChessSquare[][]): string {
  let hash = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = board[row][col];
      if (sq.piece) {
        const typeIdx = PIECE_TYPE_INDEX[sq.piece.type];
        const colorIdx = PIECE_COLOR_INDEX[sq.piece.color];
        if (typeof typeIdx === 'number' && typeof colorIdx === 'number' &&
            typeIdx >= 0 && typeIdx < 6 && colorIdx >= 0 && colorIdx < 2) {
          hash ^= zobristTable[row][col][typeIdx][colorIdx];
        }
      }
    }
  }
  return hash.toString(16);
}

/**
 * Obtiene los movimientos válidos para una pieza en una posición dada.
 * @param board - El estado actual del tablero.
 * @param position - La posición de la pieza a evaluar.
 * @returns Un array de posiciones válidas a las que la pieza puede moverse.
 */
function getValidMovesForPiece(board: ChessSquare[][], position: Position): Position[] {
  const piece = getPieceAtPosition(board, position);
  if (!piece) return [];

  const validMoves: Position[] = [];
  const fromCoords = positionToCoordinates(position);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const targetPosition = coordinatesToPosition(row, col);
      if (targetPosition === position) continue;

      if (isValidMove(board, piece, [fromCoords.row, fromCoords.col], [row, col])) {
        validMoves.push(targetPosition);
      }
    }
  }

  return validMoves;
}

/**
 * Ordena los movimientos de IA en función de su valor.
 * @param moves - Los movimientos a ordenar.
 * @param board - El estado actual del tablero.
 * @returns Los movimientos ordenados.
 */
function orderMoves(moves: AiMove[], board: ChessSquare[][]): AiMove[] {
  return moves.sort((a, b) => {
    const targetA = getPieceAtPosition(board, a.to);
    const targetB = getPieceAtPosition(board, b.to);
    const valA = targetA ? getPieceValue(targetA.type) : 0;
    const valB = targetB ? getPieceValue(targetB.type) : 0;
    return valB - valA;
  }).slice(0, currentAiConfig.MAX_BRANCHING);
}

/**
 * Realiza una búsqueda de quietud para evaluar posiciones estáticas.
 * @param board - El estado actual del tablero.
 * @param alpha - El valor mínimo que el jugador maximiza está dispuesto a aceptar.
 * @param beta - El valor máximo que el jugador minimiza está dispuesto a aceptar.
 * @param maximizingPlayer - Indica si el jugador actual es el que maximiza o minimiza.
 * @param depth - La profundidad actual de la búsqueda.
 * @returns La puntuación evaluada de la posición.
 */
function quiescenceSearch(board: ChessSquare[][], alpha: number, beta: number, maximizingPlayer: boolean, depth: number): number {
  const standPat = evaluateBoard(board);
  
  if (depth <= 0) return standPat;
  
  if (maximizingPlayer) {
    if (standPat >= beta) return beta;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return alpha;
    beta = Math.min(beta, standPat);
  }

  const color = maximizingPlayer ? PieceColor.Black : PieceColor.White;
  const pieces = getAllPiecesForColor(board, color);
  const captureMoves: AiMove[] = [];

  for (const piecePos of pieces) {
    const validMoves = getValidMovesForPiece(board, piecePos);
    for (const targetPos of validMoves) {
      const target = getPieceAtPosition(board, targetPos);
      if (target && target.color !== color) {
        captureMoves.push({ from: piecePos, to: targetPos, score: 0 });
      }
    }
  }

  const orderedCaptures = orderMoves(captureMoves, board);

  if (maximizingPlayer) {
    let value = standPat;
    for (const move of orderedCaptures) {
      const newBoard = simulateMove(board, move.from, move.to);
      const score = quiescenceSearch(newBoard, alpha, beta, false, depth - 1);
      value = Math.max(value, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = standPat;
    for (const move of orderedCaptures) {
      const newBoard = simulateMove(board, move.from, move.to);
      const score = quiescenceSearch(newBoard, alpha, beta, true, depth - 1);
      value = Math.min(value, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return value;
  }
}

/**
 * Realiza una búsqueda de minimax con poda alpha-beta.
 * @param board - El estado actual del tablero.
 * @param depth - La profundidad máxima de la búsqueda.
 * @param alpha - El valor mínimo que el jugador maximiza está dispuesto a aceptar.
 * @param beta - El valor máximo que el jugador minimiza está dispuesto a aceptar.
 * @param maximizingPlayer - Indica si el jugador actual es el que maximiza o minimiza.
 * @returns La puntuación evaluada de la posición.
 */
function minimaxAlphaBeta(board: ChessSquare[][], depth: number, alpha: number, beta: number, maximizingPlayer: boolean): number {
  // Verificar timeout para evitar bloqueos
  if (performance.now() - startTime > MAX_CALCULATION_TIME) {
    return maximizingPlayer ? -Infinity : Infinity;
  }

  const boardHash = generateBoardHash(board);
  const cacheKey = `${boardHash}|${depth}|${maximizingPlayer}`;
  
  const cachedResult = transpositionTable.get(cacheKey);
  if (cachedResult && cachedResult.depth >= depth) {
    return cachedResult.score;
  }

  if (depth === 0) {
    const score = quiescenceSearch(board, alpha, beta, maximizingPlayer, currentAiConfig.QUIESCENCE_DEPTH);
    transpositionTable.set(cacheKey, { score, depth });
    return score;
  }

  const color = maximizingPlayer ? PieceColor.Black : PieceColor.White;
  const pieces = getAllPiecesForColor(board, color);
  const moves: AiMove[] = [];

  for (const piecePos of pieces) {
    const validMoves = getValidMovesForPiece(board, piecePos);
    for (const targetPos of validMoves) {
      moves.push({ from: piecePos, to: targetPos, score: 0 });
    }
  }

  if (moves.length === 0) {
    const score = evaluateBoard(board);
    transpositionTable.set(cacheKey, { score, depth });
    return score;
  }

  const orderedMoves = orderMoves(moves, board);

  if (maximizingPlayer) {
    let value = -Infinity;
    for (const move of orderedMoves) {
      const newBoard = simulateMove(board, move.from, move.to);
      const score = minimaxAlphaBeta(newBoard, depth - 1, alpha, beta, false);
      value = Math.max(value, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    transpositionTable.set(cacheKey, { score: value, depth });
    return value;
  } else {
    let value = Infinity;
    for (const move of orderedMoves) {
      const newBoard = simulateMove(board, move.from, move.to);
      const score = minimaxAlphaBeta(newBoard, depth - 1, alpha, beta, true);
      value = Math.min(value, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    transpositionTable.set(cacheKey, { score: value, depth });
    return value;
  }
}

/**
 * Encuentra el mejor movimiento para el jugador actual.
 * @param board - El estado actual del tablero.
 * @returns El mejor movimiento encontrado o null si no hay movimientos disponibles.
 */
function findBestMove(board: ChessSquare[][]): AiMove | null {
  startTime = performance.now(); // Iniciar cronómetro
  
  const blackPieces = getAllPiecesForColor(board, PieceColor.Black);
  const possibleMoves: AiMove[] = [];

  for (const piecePos of blackPieces) {
    const validMoves = getValidMovesForPiece(board, piecePos);
    for (const targetPos of validMoves) {
      possibleMoves.push({ from: piecePos, to: targetPos, score: 0 });
    }
  }

  if (possibleMoves.length === 0) {
    return null;
  }

  const depth = currentAiConfig.MAX_DEPTH;
  let bestMove: AiMove | null = null;
  let bestScore = -Infinity;

  const orderedMoves = orderMoves(possibleMoves, board);

  for (const move of orderedMoves) {
    // Verificar timeout en cada iteración
    if (performance.now() - startTime > MAX_CALCULATION_TIME) {
      console.warn('Timeout alcanzado, retornando mejor movimiento hasta ahora');
      break;
    }

    const newBoard = simulateMove(board, move.from, move.to);
    const score = minimaxAlphaBeta(newBoard, depth - 1, -Infinity, Infinity, false);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = { ...move, score };
    }
  }

  return bestMove;
}

/**
 * Evalúa un conjunto de movimientos específicos para encontrar los mejores.
 * Utilizado por el pool de workers para distribuir la carga.
 * @param board - El estado actual del tablero.
 * @param moves - Los movimientos a evaluar.
 * @returns Array de movimientos con sus puntuaciones.
 */
function evaluateMoves(board: ChessSquare[][], moves: AiMove[]): AiMove[] {
  startTime = performance.now(); // Iniciar cronómetro
  
  const depth = currentAiConfig.MAX_DEPTH;
  const evaluatedMoves: AiMove[] = [];

  for (const move of moves) {
    // Verificar timeout en cada movimiento
    if (performance.now() - startTime > MAX_CALCULATION_TIME) {
      console.warn('Timeout en evaluación de movimientos');
      break;
    }

    const newBoard = simulateMove(board, move.from, move.to);
    const score = minimaxAlphaBeta(newBoard, depth - 1, -Infinity, Infinity, false);
    
    evaluatedMoves.push({
      ...move,
      score
    });
  }

  // Ordenar por puntuación descendente
  return evaluatedMoves.sort((a, b) => b.score - a.score);
}

function clearCache(): void {
  aiMovesCache.clear();
  transpositionTable.clear();
}

// Inicializar Zobrist al cargar el worker
initializeZobrist();

/**
 * Manejador de mensajes del worker.
 * Recibe mensajes para encontrar el mejor movimiento o limpiar la caché.
 */
addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
  try {
    switch (data.type) {
      case 'findBestMove':
        if (!data.board) {
          const response: WorkerResponse = {
            type: 'error',
            error: 'Board is required for findBestMove',
            messageId: data.messageId
          };
          postMessage(response);
          return;
        }
        const move = findBestMove(data.board);
        const response: WorkerResponse = {
          type: 'bestMove',
          move,
          messageId: data.messageId
        };
        postMessage(response);
        break;

      case 'evaluateMoves':
        if (!data.board || !data.moves) {
          const errorResponse: WorkerResponse = {
            type: 'error',
            error: 'Board and moves are required for evaluateMoves',
            messageId: data.messageId
          };
          postMessage(errorResponse);
          return;
        }
        const evaluatedMoves = evaluateMoves(data.board, data.moves);
        const movesResponse: WorkerResponse = {
          type: 'bestMoves',
          moves: evaluatedMoves,
          messageId: data.messageId
        };
        postMessage(movesResponse);
        break;

      case 'clearCache':
        clearCache();
        break;

      default:
        const errorResponse: WorkerResponse = {
          type: 'error',
          error: `Unknown message type: ${(data as any).type}`,
          messageId: data.messageId
        };
        postMessage(errorResponse);
    }
  } catch (error) {
    const errorResponse: WorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      messageId: data.messageId
    };
    postMessage(errorResponse);
  }
});