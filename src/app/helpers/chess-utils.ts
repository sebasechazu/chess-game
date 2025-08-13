import { ChessSquare, ChessPiece, PieceColor, Position, Coordinates, PieceType, SquareColor, PIECE_VALUES, PIECE_SYMBOLS } from './interfaces';

// ===== UTILIDADES DE COORDENADAS =====

/**
 * Convierte una posición de ajedrez a coordenadas numéricas
 */
export function positionToCoordinates(position: Position): Coordinates {
  const file = position.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = parseInt(position.charAt(1)) - 1; // 1=0, 2=1, etc.
  return { row: 7 - rank, col: file }; // Invertir fila para array
}

/**
 * Convierte coordenadas numéricas a posición de ajedrez
 */
export function coordinatesToPosition(row: number, col: number): Position {
  const file = String.fromCharCode(97 + col); // 0=a, 1=b, etc.
  const rank = 8 - row; // Invertir fila desde array
  return `${file}${rank}`;
}

/**
 * Valida si las coordenadas están dentro del tablero
 */
export function isValidCoordinates(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/**
 * Valida si una posición de ajedrez es válida (a1-h8)
 */
export function isValidPosition(position: Position): boolean {
  if (position.length !== 2) return false;
  const file = position.charAt(0);
  const rank = position.charAt(1);
  return file >= 'a' && file <= 'h' && rank >= '1' && rank <= '8';
}

// ===== UTILIDADES DE TABLERO =====

/**
 * Obtiene una casilla del tablero por posición
 */
export function getSquareAtPosition(board: ChessSquare[][], position: Position): ChessSquare | null {
  if (!isValidPosition(position)) return null;
  
  const coords = positionToCoordinates(position);
  const { row, col } = coords;
  
  if (!isValidCoordinates(row, col)) return null;
  
  return board[row]?.[col] || null;
}

/**
 * Obtiene una pieza del tablero por posición
 */
export function getPieceAtPosition(board: ChessSquare[][], position: Position): ChessPiece | null {
  const square = getSquareAtPosition(board, position);
  return square ? square.piece : null;
}

/**
 * Coloca una pieza en el tablero
 */
export function placePiece(board: ChessSquare[][], position: Position, piece: ChessPiece): boolean {
  const square = getSquareAtPosition(board, position);
  if (!square) return false;
  
  square.piece = piece;
  return true;
}

/**
 * Crea una copia profunda del tablero
 */
export function deepCloneBoard(board: ChessSquare[][]): ChessSquare[][] {
  return board.map(row => 
    row.map(square => ({ 
      ...square, 
      piece: square.piece ? { ...square.piece } : null 
    }))
  );
}

/**
 * Compara si dos tableros son diferentes
 */
export function hasBoardChanged(previous: ChessSquare[][], current: ChessSquare[][]): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const prevPiece = previous[row]?.[col]?.piece;
      const currPiece = current[row]?.[col]?.piece;
      
      if (!prevPiece && !currPiece) continue;
      if (!prevPiece || !currPiece) return true;
      if (prevPiece.id !== currPiece.id) return true;
    }
  }
  return false;
}

// ===== UTILIDADES DE BÚSQUEDA =====

/**
 * Obtiene todas las posiciones de piezas de un color específico
 */
export function getAllPiecesForColor(board: ChessSquare[][], color: PieceColor): Position[] {
  const pieces: Position[] = [];
  
  for (const row of board) {
    for (const square of row) {
      if (square.piece && square.piece.color === color) {
        pieces.push(square.position);
      }
    }
  }
  
  return pieces;
}

/**
 * Busca los reyes en el tablero
 */
export function findKings(board: ChessSquare[][]): { white: boolean; black: boolean } {
  let whiteKingExists = false;
  let blackKingExists = false;
  
  for (const row of board) {
    for (const square of row) {
      if (square.piece?.type === PieceType.King) {
        if (square.piece.color === PieceColor.White) {
          whiteKingExists = true;
        } else {
          blackKingExists = true;
        }
        
        // Si encontramos ambos reyes, podemos salir temprano
        if (whiteKingExists && blackKingExists) {
          return { white: true, black: true };
        }
      }
    }
  }
  
  return { white: whiteKingExists, black: blackKingExists };
}

// ===== UTILIDADES DE NOTACIÓN =====

/**
 * Genera la notación algebraica de un movimiento
 */
export function generateMoveNotation(
  piece: ChessPiece, 
  sourcePos: Position, 
  targetPos: Position, 
  capturedPiece: ChessPiece | null
): string {
  const symbol = PIECE_SYMBOLS[piece.type];
  const capture = capturedPiece ? 'x' : '';
  return `${symbol}${sourcePos}${capture}${targetPos}`;
}

// ===== UTILIDADES DE IA =====

/**
 * Calcula bonus por posición central para la IA
 */
export function getCenterPositionBonus(coords: Coordinates): number {
  const centerDistance = Math.abs(3.5 - coords.row) + Math.abs(3.5 - coords.col);
  return Math.max(0, 3 - centerDistance * 0.1);
}

/**
 * Evalúa el valor de una pieza capturada
 */
export function getPieceValue(pieceType: PieceType): number {
  return PIECE_VALUES[pieceType] || 0;
}

// ===== UTILIDADES DE INICIALIZACIÓN =====

/**
 * Crea un tablero vacío de ajedrez
 */
export function createEmptyBoard(): ChessSquare[][] {
  return Array.from({ length: 8 }, (_, row) => 
    Array.from({ length: 8 }, (_, col) => {
      const position = coordinatesToPosition(row, col);
      return {
        position,
        color: (row + col) % 2 === 0 ? SquareColor.Light : SquareColor.Dark,
        piece: null
      };
    })
  );
}

/**
 * Orden estándar de piezas en la primera fila
 */
export const INITIAL_PIECE_ORDER = [
  PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen, 
  PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook
] as const;
