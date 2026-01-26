import { describe, it, expect } from 'vitest';
import {
  positionToCoordinates,
  coordinatesToPosition,
  isValidCoordinates,
  isValidPosition,
  getPieceAtPosition,
  getSquareAtPosition,
  isPathClear,
  isValidMove,
} from './chess-basic-validation';
import { ChessPiece, ChessSquare, PieceColor, PieceType, SquareColor } from './interfaces';

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

function placePiece(board: ChessSquare[][], piece: ChessPiece, row: number, col: number) {
  board[row][col].piece = { ...piece };
}

function mkPiece(type: PieceType, color: PieceColor, position: string, id = Math.floor(Math.random() * 10000)): ChessPiece {
  return { id, type, color, position };
}

describe('chess-basic-validation: coordinates/position helpers', () => {
  it('positionToCoordinates convierte correctamente a1, h8, e4', () => {
    expect(positionToCoordinates('a1')).toEqual({ row: 7, col: 0 });
    expect(positionToCoordinates('h8')).toEqual({ row: 0, col: 7 });
    expect(positionToCoordinates('e4')).toEqual({ row: 4, col: 4 });
  });

  it('coordinatesToPosition convierte correctamente (7,0),(0,7),(4,4)', () => {
    expect(coordinatesToPosition(7, 0)).toBe('a1');
    expect(coordinatesToPosition(0, 7)).toBe('h8');
    expect(coordinatesToPosition(4, 4)).toBe('e4');
  });

  it('isValidCoordinates valida límites del tablero', () => {
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(7, 7)).toBe(true);
    expect(isValidCoordinates(-1, 0)).toBe(false);
    expect(isValidCoordinates(0, 8)).toBe(false);
  });

  it('isValidPosition valida cadenas algebraicas', () => {
    expect(isValidPosition('a1')).toBe(true);
    expect(isValidPosition('h8')).toBe(true);
    expect(isValidPosition('i9')).toBe(false);
    expect(isValidPosition('a0')).toBe(false);
    expect(isValidPosition('aa')).toBe(false);
    expect(isValidPosition('a10')).toBe(false);
  });
});

describe('chess-basic-validation: acceso a piezas/casillas', () => {
  it('getPieceAtPosition devuelve pieza correcta o null', () => {
    const board = makeEmptyBoard();
    const { row, col } = positionToCoordinates('e4');
    placePiece(board, mkPiece(PieceType.Queen, PieceColor.White, 'e4'), row, col);

    expect(getPieceAtPosition(board, 'e4')?.type).toBe(PieceType.Queen);
    expect(getPieceAtPosition(board, 'e5')).toBeNull();
    expect(getPieceAtPosition(board, 'z9')).toBeNull();
  });

  it('getSquareAtPosition devuelve casilla correcta o null por fuera del tablero', () => {
    const board = makeEmptyBoard();
    const sq = getSquareAtPosition(board, 'a1');
    expect(sq).not.toBeNull();
    expect(sq!.position).toBe('a1');

    expect(getSquareAtPosition(board, 'q0')).toBeNull();
  });
});

describe('chess-basic-validation: isPathClear', () => {
  it('detecta caminos despejados en líneas y diagonales', () => {
    const board = makeEmptyBoard();
    // Horizontal a1 -> a8
    expect(isPathClear(board, 7, 0, 7, 7)).toBe(true);
    // Diagonal c1 -> f4 (7,2) -> (4,5)
    expect(isPathClear(board, 7, 2, 4, 5)).toBe(true);
  });

  it('detecta bloqueos en el camino', () => {
    const board = makeEmptyBoard();
    // Bloquear camino horizontal entre a1 (7,0) y a8 (7,7) colocando pieza en a4 (7,3)
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'a4'), 7, 3);
    expect(isPathClear(board, 7, 0, 7, 7)).toBe(false);
  });
});

describe('chess-basic-validation: isValidMove por pieza', () => {
  it('peón blanco: avance simple, doble desde inicio y captura diagonal', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('e2'); // (6,4)
    const whitePawn = mkPiece(PieceType.Pawn, PieceColor.White, 'e2');
    placePiece(board, whitePawn, from.row, from.col);

    // avance 1
    let to = positionToCoordinates('e3');
    expect(isValidMove(board, whitePawn, [from.row, from.col], [to.row, to.col])).toBe(true);

    // avance 2 desde inicio (e4 libre)
    to = positionToCoordinates('e4');
    expect(isValidMove(board, whitePawn, [from.row, from.col], [to.row, to.col])).toBe(true);

    // captura diagonal f3 con pieza negra
    const f3 = positionToCoordinates('f3');
    placePiece(board, mkPiece(PieceType.Knight, PieceColor.Black, 'f3'), f3.row, f3.col);
    expect(isValidMove(board, whitePawn, [from.row, from.col], [f3.row, f3.col])).toBe(true);

    // no puede capturar hacia adelante
    const e3 = positionToCoordinates('e3');
    placePiece(board, mkPiece(PieceType.Knight, PieceColor.Black, 'e3'), e3.row, e3.col);
    expect(isValidMove(board, whitePawn, [from.row, from.col], [e3.row, e3.col])).toBe(false);

    // no puede mover hacia atrás
    const e1 = positionToCoordinates('e1');
    expect(isValidMove(board, whitePawn, [from.row, from.col], [e1.row, e1.col])).toBe(false);
  });

  it('peón negro: avance y captura en dirección opuesta', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('d7'); // (1,3)
    const blackPawn = mkPiece(PieceType.Pawn, PieceColor.Black, 'd7');
    placePiece(board, blackPawn, from.row, from.col);

    // avance 1
    let to = positionToCoordinates('d6');
    expect(isValidMove(board, blackPawn, [from.row, from.col], [to.row, to.col])).toBe(true);

    // avance 2 desde inicio
    to = positionToCoordinates('d5');
    expect(isValidMove(board, blackPawn, [from.row, from.col], [to.row, to.col])).toBe(true);

    // captura diagonal c6 con pieza blanca
    const c6 = positionToCoordinates('c6');
    placePiece(board, mkPiece(PieceType.Bishop, PieceColor.White, 'c6'), c6.row, c6.col);
    expect(isValidMove(board, blackPawn, [from.row, from.col], [c6.row, c6.col])).toBe(true);
  });

  it('torre: movimientos ortogonales con y sin bloqueo', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('a1');
    const rook = mkPiece(PieceType.Rook, PieceColor.White, 'a1');
    placePiece(board, rook, from.row, from.col);

    // libre a8
    let to = positionToCoordinates('a8');
    expect(isValidMove(board, rook, [from.row, from.col], [to.row, to.col])).toBe(true);

    // bloquear en a4
    const a4 = positionToCoordinates('a4');
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'a4'), a4.row, a4.col);
    expect(isValidMove(board, rook, [from.row, from.col], [to.row, to.col])).toBe(false);
  });

  it('caballo: movimientos en L y salto sobre piezas', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('d4');
    const knight = mkPiece(PieceType.Knight, PieceColor.White, 'd4');
    placePiece(board, knight, from.row, from.col);

    // destino válido f5
    let to = positionToCoordinates('f5');
    expect(isValidMove(board, knight, [from.row, from.col], [to.row, to.col])).toBe(true);

    // salto sobre pieza intermedia (no debería importar)
    const e5 = positionToCoordinates('e5');
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'e5'), e5.row, e5.col);
    to = positionToCoordinates('e4'); // no es movimiento de caballo
    expect(isValidMove(board, knight, [from.row, from.col], [to.row, to.col])).toBe(false);

    to = positionToCoordinates('e2'); // válido
    expect(isValidMove(board, knight, [from.row, from.col], [to.row, to.col])).toBe(true);
  });

  it('alfil: diagonales claras y bloqueo intermedio', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('c1');
    const bishop = mkPiece(PieceType.Bishop, PieceColor.White, 'c1');
    placePiece(board, bishop, from.row, from.col);

    // destino válido f4
    let to = positionToCoordinates('f4');
    expect(isValidMove(board, bishop, [from.row, from.col], [to.row, to.col])).toBe(true);

    // bloqueo en e3
    const e3 = positionToCoordinates('e3');
    placePiece(board, mkPiece(PieceType.Pawn, PieceColor.White, 'e3'), e3.row, e3.col);
    expect(isValidMove(board, bishop, [from.row, from.col], [to.row, to.col])).toBe(false);
  });

  it('reina: combina torre + alfil', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('d4');
    const queen = mkPiece(PieceType.Queen, PieceColor.White, 'd4');
    placePiece(board, queen, from.row, from.col);

    // horizontal a4
    let to = positionToCoordinates('a4');
    expect(isValidMove(board, queen, [from.row, from.col], [to.row, to.col])).toBe(true);

    // diagonal h8
    to = positionToCoordinates('h8');
    expect(isValidMove(board, queen, [from.row, from.col], [to.row, to.col])).toBe(true);
  });

  it('rey: un paso en cualquier dirección', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('e4');
    const king = mkPiece(PieceType.King, PieceColor.White, 'e4');
    placePiece(board, king, from.row, from.col);

    // un paso
    let to = positionToCoordinates('e5');
    expect(isValidMove(board, king, [from.row, from.col], [to.row, to.col])).toBe(true);
    to = positionToCoordinates('f5');
    expect(isValidMove(board, king, [from.row, from.col], [to.row, to.col])).toBe(true);

    // más de un paso no válido
    to = positionToCoordinates('g6');
    expect(isValidMove(board, king, [from.row, from.col], [to.row, to.col])).toBe(false);
  });

  it('no permite capturar piezas del mismo color', () => {
    const board = makeEmptyBoard();
    const from = positionToCoordinates('e4');
    const to = positionToCoordinates('e5');
    const pawn = mkPiece(PieceType.Pawn, PieceColor.White, 'e4');
    placePiece(board, pawn, from.row, from.col);
    placePiece(board, mkPiece(PieceType.Knight, PieceColor.White, 'e5'), to.row, to.col);

    expect(isValidMove(board, pawn, [from.row, from.col], [to.row, to.col])).toBe(false);
  });
});
