/**
 * Funciones de validación y utilidades básicas consolidadas
 * Este archivo reemplaza las duplicaciones entre chess-validation.ts y partes de chess-utils.ts
 */
import { ChessPiece, ChessSquare, PieceType, PieceColor, Position } from './interfaces';

/**
 * Constantes para el tamaño del tablero y códigos ASCII
 */
export const BOARD_SIZE = 8;
export const FILE_A_CODE = 97;


/**
 * Convierte una posición en notación algebraica a coordenadas de matriz
 * @param position Posición en notación algebraica (e.g., 'e4')
 * @returns Objeto con fila y columna
 */
export function positionToCoordinates(position: Position): { row: number; col: number } {
    const file = position.charCodeAt(0) - FILE_A_CODE;
    const rank = Number(position.charAt(1)) - 1;
    return { row: BOARD_SIZE - 1 - rank, col: file };
}

/**
 * Convierte coordenadas de matriz a posición en notación algebraica
 * @param row Fila en la matriz
 * @param col Columna en la matriz
 * @returns Posición en notación algebraica (e.g., 'e4')
 */
export function coordinatesToPosition(row: number, col: number): Position {
    const file = String.fromCharCode(FILE_A_CODE + col);
    const rank = BOARD_SIZE - row;
    return `${file}${rank}`;
}

/**
 * Verifica si las coordenadas están dentro de los límites del tablero
 * @param row Fila en la matriz
 * @param col Columna en la matriz
 * @returns Verdadero si las coordenadas son válidas
 */
export function isValidCoordinates(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Obtiene la pieza en una posición específica del tablero.
 * @param board - Estado actual del tablero
 * @param position - Posición en notación algebraica (e.g., 'e4')
 * @returns La pieza en la posición o null si está vacía o inválida
 */
export function getPieceAtPosition(board: ChessSquare[][], position: Position): ChessPiece | null {
    const coords = positionToCoordinates(position);
    if (!isValidCoordinates(coords.row, coords.col)) return null;
    return board[coords.row][coords.col].piece;
}

/**
 * Obtiene una casilla del tablero por posición
 * @param board - Estado actual del tablero
 * @param position - Posición en notación algebraica (e.g., 'e4')
 * @returns La casilla correspondiente o null si la posición es inválida
 */
export function getSquareAtPosition(board: ChessSquare[][], position: Position): ChessSquare | null {
    const coords = positionToCoordinates(position);
    if (!isValidCoordinates(coords.row, coords.col)) return null;
    return board[coords.row][coords.col];
}

/**
 * Verifica si una posición en notación algebraica es válida dentro del tablero
 * @param position Posición en notación algebraica (e.g., 'e4')
 * @returns Verdadero si la posición es válida
 */
export function isValidPosition(position: Position): boolean {
    if (position.length !== 2) return false;
    const file = position.charCodeAt(0);
    const rank = position.charCodeAt(1);
    return file >= FILE_A_CODE && file < FILE_A_CODE + BOARD_SIZE && rank >= 49 && rank < 49 + BOARD_SIZE;
}

/**
 * Verifica si el camino entre dos posiciones está despejado (sin piezas en medio)
 * @param board Estado actual del tablero
 * @param fromRow Fila de origen
 * @param fromCol Columna de origen
 * @param toRow Fila de destino
 * @param toCol Columna de destino
 * @returns Verdadero si el camino está despejado
 */
export function isPathClear(board: ChessSquare[][], fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowStep = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
    const colStep = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol].piece) return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

/**
 * Verifica si es un movimiento válido según las reglas básicas de cada pieza
 * @param board Estado actual del tablero
 * @param piece Pieza que se mueve
 * @param from origen del movimiento [fila, columna]
 * @param to destino del movimiento [fila, columna]
 * @returns Verdadero si el movimiento es válido
 */
export function isValidMove(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    if (!isValidCoordinates(toRow, toCol)) return false;

    if (fromRow === toRow && fromCol === toCol) return false;

    const targetPiece = board[toRow][toCol].piece;
    if (targetPiece && targetPiece.color === piece.color) return false;
    return isValidMoveByRules(board, piece, [fromRow, fromCol], [toRow, toCol]);
}

/**
 * Verifica si un movimiento es válido según las reglas específicas de cada pieza
 * @param board - El estado actual del tablero
 * @param piece - Pieza que se mueve
 * @param from - Origen del movimiento [fila, columna]
 * @param to - Destino del movimiento [fila, columna]
 * @returns Verdadero si el movimiento es válido
 */
function isValidMoveByRules(board: ChessSquare[][], piece: ChessPiece, from: [number, number], to: [number, number]): boolean {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    switch (piece.type) {
        case PieceType.Pawn:
            return isValidPawnMoveInternal(board, piece, fromRow, fromCol, toRow, toCol);
        case PieceType.Rook:
            return isValidRookMoveInternal(board, fromRow, fromCol, toRow, toCol);
        case PieceType.Knight:
            return isValidKnightMoveInternal(fromRow, fromCol, toRow, toCol);
        case PieceType.Bishop:
            return isValidBishopMoveInternal(board, fromRow, fromCol, toRow, toCol);
        case PieceType.Queen:
            return isValidQueenMoveInternal(board, fromRow, fromCol, toRow, toCol);
        case PieceType.King:
            return isValidKingMoveInternal(fromRow, fromCol, toRow, toCol);
        default:
            return false;
    }
}

/**
 *  Verifica si un movimiento de peón es válido
 * @param board - El estado actual del tablero
 * @param piece - Pieza que se mueve
 * @param fromRow - Fila de origen
 * @param fromCol - Columna de origen
 * @param toRow - Fila de destino
 * @param toCol - Columna de destino
 * @returns Verdadero si el movimiento es válido
 */
function isValidPawnMoveInternal(board: ChessSquare[][], piece: ChessPiece, fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const direction = piece.color === PieceColor.White ? -1 : 1;
    const startRow = piece.color === PieceColor.White ? BOARD_SIZE - 2 : 1;
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const isCapture = board[toRow][toCol].piece !== null;

    if (isCapture) {
        return Math.abs(colDiff) === 1 && rowDiff === direction;
    }
    if (colDiff === 0 && rowDiff === direction) {
        return true;
    }
    if (colDiff === 0 && rowDiff === 2 * direction && fromRow === startRow) {
        return !board[fromRow + direction][fromCol].piece;
    }
    return false;
}

/**
 * Verifica si un movimiento de torre es válido (movimientos ortogonales)
 * @param board  - El estado actual del tablero
 * @param fromRow  - Fila de origen
 * @param fromCol  - Columna de origen
 * @param toRow  - Fila de destino
 * @param toCol  - Columna de destino
 * @returns  Verdadero si el movimiento es válido
 */
function isValidRookMoveInternal(board: ChessSquare[][], fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    if ((fromRow === toRow && fromCol !== toCol) || (fromCol === toCol && fromRow !== toRow)) {
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
    return false;
}

/**
 * Verifica si un movimiento de caballo es válido (movimientos en L)
 * @param fromRow - Fila de origen
 * @param fromCol - Columna de origen
 * @param toRow - Fila de destino
 * @param toCol - Columna de destino
 * @returns Verdadero si el movimiento es válido
 */
function isValidKnightMoveInternal(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

/**
 * Verifica si un movimiento de alfil es válido (movimientos diagonales)
 * @param board - El estado actual del tablero
 * @param fromRow  - Fila de origen
 * @param fromCol  - Columna de origen
 * @param toRow - Fila de destino
 * @param toCol  - Columna de destino
 * @returns  Verdadero si el movimiento es válido
 */
function isValidBishopMoveInternal(board: ChessSquare[][], fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (rowDiff === colDiff && rowDiff > 0) {
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
    }
    return false;
}

/**
 * Verifica si un movimiento de reina es válido
 * @param board - El estado actual del tablero
 * @param fromRow - Fila de origen
 * @param fromCol - Columna de origen
 * @param toRow - Fila de destino
 * @param toCol -Columna de destino
 * @returns  Verdadero si el movimiento es válido
 */
function isValidQueenMoveInternal(board: ChessSquare[][], fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    return isValidRookMoveInternal(board, fromRow, fromCol, toRow, toCol) ||
        isValidBishopMoveInternal(board, fromRow, fromCol, toRow, toCol);
}

/**
 * Verifica si un movimiento de el rey es válido
 * @param fromRow - Fila de origen
 * @param fromCol - Columna de origen
 * @param toRow - Fila de destino
 * @param toCol - Columna de destino
 * @returns Verdadero si el movimiento es válido
 */
function isValidKingMoveInternal(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}