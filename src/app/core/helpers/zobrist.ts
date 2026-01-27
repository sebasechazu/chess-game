// Zobrist hashing para ajedrez
// Genera una tabla de números aleatorios para cada pieza, color y casilla
import { PieceType, PieceColor } from './interfaces';

const ZOBRIST_SIZE = 8;
const PIECE_TYPES = [
  PieceType.Pawn,
  PieceType.Knight,
  PieceType.Bishop,
  PieceType.Rook,
  PieceType.Queen,
  PieceType.King
];
const PIECE_COLORS = [PieceColor.White, PieceColor.Black];

// Tabla Zobrist: [fila][col][tipo][color]
export const zobristTable: number[][][][] = (() => {
  const table: number[][][][] = [];
  let seed = 123456789;
  function random32() {
    // Xorshift simple
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return Math.abs(seed) >>> 0;
  }
  for (let row = 0; row < ZOBRIST_SIZE; row++) {
    table[row] = [];
    for (let col = 0; col < ZOBRIST_SIZE; col++) {
      table[row][col] = [];
      for (let t = 0; t < PIECE_TYPES.length; t++) {
        table[row][col][t] = [];
        for (let c = 0; c < PIECE_COLORS.length; c++) {
          table[row][col][t][c] = random32();
        }
      }
    }
  }
  return table;
})();
