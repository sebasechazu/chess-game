/**
 * Constantes compartidas para el juego de ajedrez
 * Incluye configuración de IA, tablas de posición y valores numéricos
 */

import { PieceType } from './interfaces';

/**
 * Configuración de la IA - Máxima dificultad optimizada
 */
export const AI_CONFIG = {
  MAX_DEPTH: 5, // Profundidad equilibrada para rendimiento
  MAX_BRANCHING: 20, // Análisis amplio pero manejable
  QUIESCENCE_DEPTH: 4 // Búsqueda profunda de capturas
} as const;

/**
 * Mapas para convertir enums string a índices numéricos para Zobrist
 */
export const PIECE_TYPE_INDEX: Record<string, number> = {
  pawn: 0,
  knight: 1,
  bishop: 2,
  rook: 3,
  queen: 4,
  king: 5
} as const;

export const PIECE_COLOR_INDEX: Record<string, number> = {
  white: 0,
  black: 1
} as const;

/**
 * Tablas de valores posicionales para cada tipo de pieza
 * Estas tablas guían a la IA para colocar las piezas en mejores posiciones
 */

// Tabla de valores para peones - favorece el avance y control del centro
export const PAWN_POSITION_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
] as const;

// Tabla de valores para caballos - favorece posiciones centrales
export const KNIGHT_POSITION_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
] as const;

// Tabla de valores para alfiles - favorece diagonales largas
export const BISHOP_POSITION_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
] as const;

// Tabla de valores para torres - favorece filas y columnas abiertas
export const ROOK_POSITION_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
] as const;

// Tabla de valores para la reina - posiciones centrales balanceadas
export const QUEEN_POSITION_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
] as const;

// Tabla de valores para el rey - favorece seguridad en esquinas durante el juego medio
export const KING_POSITION_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
] as const;

/**
 * Mapa de tablas de posición indexado por tipo de pieza
 */
export const POSITION_TABLES = {
  [PieceType.Pawn]: PAWN_POSITION_TABLE,
  [PieceType.Knight]: KNIGHT_POSITION_TABLE,
  [PieceType.Bishop]: BISHOP_POSITION_TABLE,
  [PieceType.Rook]: ROOK_POSITION_TABLE,
  [PieceType.Queen]: QUEEN_POSITION_TABLE,
  [PieceType.King]: KING_POSITION_TABLE
} as const;

/**
 * Factores de peso para diferentes aspectos de la evaluación
 */
export const EVALUATION_WEIGHTS = {
  MATERIAL: 1.0,
  POSITION: 0.01,
  DEVELOPMENT: 0.5,
  KING_SAFETY: 1.0,
  PAWN_STRUCTURE: 0.5
} as const;

/**
 * Constantes para penalizaciones y bonificaciones específicas
 */
export const CHESS_BONUSES = {
  DOUBLED_PAWN_PENALTY: 0.5,
  ISOLATED_PAWN_PENALTY: 0.5,
  CASTLING_BONUS: 1.0,
  CENTER_KING_PENALTY: 2.0,
  DEVELOPMENT_BONUS: 0.5
} as const;