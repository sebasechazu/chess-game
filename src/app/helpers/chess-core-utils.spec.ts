import { describe, it, expect } from 'vitest';
import {
  deepCloneBoard,
  getAllPiecesForColor,
  getPieceValue,
  simulateMove,
  generateSimpleBoardHash,
  findKingPosition,
  findKings,
  getCenterPositionBonus,
  hasBoardChanged,
  countMaterial,
} from './chess-core-utils';
import { ChessPiece, ChessSquare, PieceColor, PieceType, SquareColor, PIECE_VALUES } from './interfaces';

function makeEmptyBoard(): ChessSquare[][] {
  const board: ChessSquare[][] = [];
  for (let row = 0; row < 8; row++) {
    const line: ChessSquare[] = [];
    for (let col = 0; col < 8; col++) {
      const isDark = (row + col) % 2 === 1;
      line.push({
        position: `${String.fromCharCode(97 + col)}${8 - row}`,
        color: isDark ? SquareColor.Dark : SquareColor.Light,
        piece: null,
      });
    }
    board.push(line);
  }
  return board;
}

function mkPiece(type: PieceType, color: PieceColor, position: string, id = Math.floor(Math.random() * 10000)): ChessPiece {
  return { id, type, color, position };
}

function placePiece(board: ChessSquare[][], piece: ChessPiece, row: number, col: number) {
  board[row][col].piece = { ...piece };
}

describe('chess-core-utils: deepCloneBoard', () => {
  it('clona profundamente el tablero sin referencias compartidas', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.Queen, PieceColor.White, 'e1', 1), 7, 4);

    const cloned = deepCloneBoard(board);

    // Modificar el original no afecta el clon
    board[7][4].piece = null;
    expect(cloned[7][4].piece).not.toBeNull();
    expect(cloned[7][4].piece?.type).toBe(PieceType.Queen);
  });

  it('preserva el estado inicial del tablero vacío', () => {
    const board = makeEmptyBoard();
    const cloned = deepCloneBoard(board);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        expect(cloned[row][col].position).toBe(board[row][col].position);
        expect(cloned[row][col].piece).toBeNull();
      }
    }
  });
});

describe('chess-core-utils: getAllPiecesForColor', () => {
  it('obtiene todas las piezas blancas en el tablero', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'e2', 2), 6, 4);
    placePiece(board, mkPiece(PieceType.Queen, PieceColor.Black, 'd8', 3), 0, 3);

    const whitePieces = getAllPiecesForColor(board, PieceColor.White);
    expect(whitePieces).toHaveLength(2);
    expect(whitePieces).toContain('e1');
    expect(whitePieces).toContain('e2');
  });

  it('obtiene todas las piezas negras en el tablero', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.Queen, PieceColor.Black, 'd8', 1), 0, 3);
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.Black, 'd7', 2), 1, 3);
    placePiece(board, mkPiece(PieceType.King, PieceColor.White, 'e1', 3), 7, 4);

    const blackPieces = getAllPiecesForColor(board, PieceColor.Black);
    expect(blackPieces).toHaveLength(2);
    expect(blackPieces).toContain('d8');
    expect(blackPieces).toContain('d7');
  });

  it('retorna array vacío si no hay piezas del color', () => {
    const board = makeEmptyBoard();
    const pieces = getAllPiecesForColor(board, PieceColor.White);
    expect(pieces).toHaveLength(0);
  });
});

describe('chess-core-utils: getPieceValue', () => {
  it('retorna valores correctos para todas las piezas', () => {
    expect(getPieceValue(PieceType.Pawn)).toBe(PIECE_VALUES[PieceType.Pawn]);
    expect(getPieceValue(PieceType.Knight)).toBe(3);
    expect(getPieceValue(PieceType.Bishop)).toBe(3);
    expect(getPieceValue(PieceType.Rook)).toBe(5);
    expect(getPieceValue(PieceType.Queen)).toBe(9);
    expect(getPieceValue(PieceType.King)).toBe(100);
  });
});

describe('chess-core-utils: simulateMove', () => {
  it('simula movimiento sin modificar el tablero original', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'e2', 1), 6, 4);

    const newBoard = simulateMove(board, 'e2', 'e4');

    // Original no cambia
    expect(board[6][4].piece?.position).toBe('e2');
    expect(board[4][4].piece).toBeNull();

    // Nuevo tablero tiene el movimiento
    expect(newBoard[6][4].piece).toBeNull();
    expect(newBoard[4][4].piece?.position).toBe('e4');
    expect(newBoard[4][4].piece?.hasMoved).toBe(true);
  });

  it('simula captura correctamente', () => {
    const board = makeEmptyBoard();
    const whitePawn = mkPiece(PieceType.Pawn, PieceColor.White, 'e4', 1);
    const blackPawn = mkPiece(PieceType.Pawn, PieceColor.Black, 'd3', 2);
    placePiece(board, whitePawn, 4, 4);
    placePiece(board, blackPawn, 5, 3);

    const newBoard = simulateMove(board, 'e4', 'd3');

    expect(newBoard[4][4].piece).toBeNull();
    expect(newBoard[5][3].piece?.id).toBe(1); // pieza blanca capturó
  });

  it('retorna tablero sin cambios si no hay pieza de origen', () => {
    const board = makeEmptyBoard();
    const newBoard = simulateMove(board, 'e2', 'e4');

    expect(newBoard[4][4].piece).toBeNull();
  });
});

describe('chess-core-utils: generateSimpleBoardHash', () => {
  it('genera hash diferente para tableros diferentes', () => {
    const board1 = makeEmptyBoard();
    placePiece(board1, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);

    const board2 = makeEmptyBoard();
    placePiece(board2, mkPiece(PieceType.King, PieceColor.White, 'd1', 1), 7, 3);

    expect(generateSimpleBoardHash(board1)).not.toBe(generateSimpleBoardHash(board2));
  });

  it('genera hash idéntico para tableros idénticos', () => {
    const board1 = makeEmptyBoard();
    placePiece(board1, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);
    placePiece(board1, mkPiece(PieceType.Queen, PieceColor.Black, 'd8', 2), 0, 3);

    const board2 = deepCloneBoard(board1);

    expect(generateSimpleBoardHash(board1)).toBe(generateSimpleBoardHash(board2));
  });

  it('retorna string vacío para tablero vacío', () => {
    const board = makeEmptyBoard();
    expect(generateSimpleBoardHash(board)).toBe('');
  });
});

describe('chess-core-utils: findKingPosition', () => {
  it('encuentra el rey blanco en el tablero', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);

    expect(findKingPosition(board, PieceColor.White)).toBe('e1');
  });

  it('encuentra el rey negro en el tablero', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.King, PieceColor.Black, 'e8', 1), 0, 4);

    expect(findKingPosition(board, PieceColor.Black)).toBe('e8');
  });

  it('retorna null si el rey no está en el tablero', () => {
    const board = makeEmptyBoard();
    expect(findKingPosition(board, PieceColor.White)).toBeNull();
  });
});

describe('chess-core-utils: findKings', () => {
  it('detecta ambos reyes presentes', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);
    placePiece(board, mkPiece(PieceType.King, PieceColor.Black, 'e8', 2), 0, 4);

    const kings = findKings(board);
    expect(kings.white).toBe(true);
    expect(kings.black).toBe(true);
  });

  it('detecta falta de rey blanco', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.King, PieceColor.Black, 'e8', 1), 0, 4);

    const kings = findKings(board);
    expect(kings.white).toBe(false);
    expect(kings.black).toBe(true);
  });

  it('detecta tablero sin reyes', () => {
    const board = makeEmptyBoard();
    const kings = findKings(board);
    expect(kings.white).toBe(false);
    expect(kings.black).toBe(false);
  });
});

describe('chess-core-utils: getCenterPositionBonus', () => {
  it('otorga máximo bonus en el centro (d4, e4, d5, e5)', () => {
    // Centro del tablero: filas 3-4, columnas 3-4
    expect(getCenterPositionBonus(3, 3)).toBeGreaterThan(getCenterPositionBonus(0, 0));
    expect(getCenterPositionBonus(4, 4)).toBeGreaterThan(getCenterPositionBonus(7, 7));
  });

  it('otorga bonus mínimo en esquinas lejanas del centro', () => {
    const bonusCorner = getCenterPositionBonus(0, 0);
    const bonusCenter = getCenterPositionBonus(3, 3);
    expect(bonusCorner).toBeLessThan(bonusCenter);
    expect(bonusCorner).toBeGreaterThanOrEqual(0); // Math.max(0, ...) asegura nunca negativo
  });

  it('calcula bonus correctamente para posiciones intermedias', () => {
    const bonusCenter = getCenterPositionBonus(3, 3);
    const bonusEdge = getCenterPositionBonus(0, 0);
    expect(bonusCenter).toBeGreaterThan(bonusEdge);
  });
});

describe('chess-core-utils: hasBoardChanged', () => {
  it('detecta que tableros vacíos son iguales', () => {
    const board1 = makeEmptyBoard();
    const board2 = makeEmptyBoard();
    expect(hasBoardChanged(board1, board2)).toBe(false);
  });

  it('detecta cambio de posición de pieza', () => {
    const board1 = makeEmptyBoard();
    placePiece(board1, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);

    const board2 = deepCloneBoard(board1);
    board2[7][4].piece = null;
    board2[7][3].piece = mkPiece(PieceType.King, PieceColor.White, 'd1', 1);

    expect(hasBoardChanged(board1, board2)).toBe(true);
  });

  it('detecta captura de pieza', () => {
    const board1 = makeEmptyBoard();
    placePiece(board1, mkPiece(PieceType.Pawn, PieceColor.White, 'e4', 1), 4, 4);
    placePiece(board1, mkPiece(PieceType.Pawn, PieceColor.Black, 'e5', 2), 3, 4);

    const board2 = deepCloneBoard(board1);
    board2[3][4].piece = null;

    expect(hasBoardChanged(board1, board2)).toBe(true);
  });

  it('retorna false si IDs de piezas son iguales', () => {
    const board1 = makeEmptyBoard();
    const piece = mkPiece(PieceType.King, PieceColor.White, 'e1', 99);
    placePiece(board1, piece, 7, 4);

    const board2 = deepCloneBoard(board1);
    expect(hasBoardChanged(board1, board2)).toBe(false);
  });
});

describe('chess-core-utils: countMaterial', () => {
  it('cuenta material total de piezas blancas', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.Queen, PieceColor.White, 'e1', 1), 7, 4);
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'e2', 2), 6, 4);
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.Black, 'd7', 3), 1, 3);

    const whiteMaterial = countMaterial(board, PieceColor.White);
    expect(whiteMaterial).toBe(9 + 1); // Queen + Pawn
  });

  it('cuenta material correcto con múltiples piezas de mismo tipo', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.Black, 'a7', 1), 1, 0);
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.Black, 'b7', 2), 1, 1);
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.Black, 'c7', 3), 1, 2);

    const blackMaterial = countMaterial(board, PieceColor.Black);
    expect(blackMaterial).toBe(3); // 3 peones
  });

  it('retorna 0 para color sin piezas', () => {
    const board = makeEmptyBoard();
    placePiece(board, mkPiece(PieceType.King, PieceColor.White, 'e1', 1), 7, 4);

    expect(countMaterial(board, PieceColor.Black)).toBe(0);
  });

  it('cuenta material en posición inicial típica', () => {
    const board = makeEmptyBoard();
    // Reinas, torres, alfiles, caballos y peones
    placePiece(board, mkPiece(PieceType.Queen, PieceColor.White, 'd1', 1), 7, 3);
    placePiece(board, mkPiece(PieceType.Rook, PieceColor.White, 'a1', 2), 7, 0);
    placePiece(board, mkPiece(PieceType.Bishop, PieceColor.White, 'f1', 3), 7, 5);
    placePiece(board, mkPiece(PieceType.Knight, PieceColor.White, 'g1', 4), 7, 6);

    const whiteMaterial = countMaterial(board, PieceColor.White);
    expect(whiteMaterial).toBe(9 + 5 + 3 + 3); // Q + R + B + N
  });
});
