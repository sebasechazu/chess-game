import { ChessSquare, ChessPiece, PieceColor, Position, Coordinates, PieceType, SquareColor, PIECE_VALUES, PIECE_SYMBOLS } from './interfaces';

/**
 * Convierte una posición de ajedrez a coordenadas numéricas
 * @param position - Posición en notación algebraica (ej: 'e4')
 * @returns Coordenadas numéricas {row, col}
 */
export function positionToCoordinates(position: Position): Coordinates {
  const file = position.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = parseInt(position.charAt(1)) - 1; // 1=0, 2=1, etc.
  return { row: 7 - rank, col: file }; // Invertir fila para array
}

/**
 * Convierte coordenadas numéricas a posición de ajedrez
 * @param row - Fila del tablero (0-7)
 * @param col - Columna del tablero (0-7)
 * @returns Posición en notación algebraica
 */
export function coordinatesToPosition(row: number, col: number): Position {
  const file = String.fromCharCode(97 + col); // 0=a, 1=b, etc.
  const rank = 8 - row; // Invertir fila desde array
  return `${file}${rank}`;
}

/**
 * Valida si las coordenadas están dentro del tablero
 * @param row - Fila a validar
 * @param col - Columna a validar
 * @returns Verdadero si las coordenadas son válidas
 */
export function isValidCoordinates(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/**
 * Valida si una posición de ajedrez es válida (a1-h8)
 * @param position - Posición a validar
 * @returns Verdadero si la posición es válida
 */
export function isValidPosition(position: Position): boolean {
  if (position.length !== 2) return false;
  const file = position.charAt(0);
  const rank = position.charAt(1);
  return file >= 'a' && file <= 'h' && rank >= '1' && rank <= '8';
}

/**
 * Obtiene una casilla del tablero por posición
 * @param board - Tablero actual
 * @param position - Posición de la casilla
 * @returns Casilla del tablero o null si no existe
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
 * @param board - Tablero actual
 * @param position - Posición de la pieza
 * @returns Pieza encontrada o null si no existe
 */
export function getPieceAtPosition(board: ChessSquare[][], position: Position): ChessPiece | null {
  const square = getSquareAtPosition(board, position);
  return square ? square.piece : null;
}

/**
 * Coloca una pieza en el tablero
 * @param board - Tablero actual
 * @param position - Posición donde colocar la pieza
 * @param piece - Pieza a colocar
 * @returns Verdadero si se colocó exitosamente
 */
export function placePiece(board: ChessSquare[][], position: Position, piece: ChessPiece): boolean {
  const square = getSquareAtPosition(board, position);
  if (!square) return false;
  
  square.piece = piece;
  return true;
}

/**
 * Crea una copia profunda del tablero
 * @param board - Tablero a clonar
 * @returns Nueva instancia del tablero
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
 * @param previous - Tablero anterior
 * @param current - Tablero actual
 * @returns Verdadero si los tableros son diferentes
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

/**
 * Obtiene todas las posiciones de piezas de un color específico
 * @param board - Tablero actual
 * @param color - Color de las piezas a buscar
 * @returns Array de posiciones de piezas del color especificado
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
 * @param board - Tablero actual
 * @returns Objeto indicando si existen los reyes blanco y negro
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
        
        if (whiteKingExists && blackKingExists) {
          return { white: true, black: true };
        }
      }
    }
  }
  
  return { white: whiteKingExists, black: blackKingExists };
}

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

/**
 * Calcula bonus por posición central para la IA
 * @param coords - Coordenadas a evaluar
 * @returns Valor de bonus por posición central
 */
export function getCenterPositionBonus(coords: Coordinates): number {
  const centerDistance = Math.abs(3.5 - coords.row) + Math.abs(3.5 - coords.col);
  return Math.max(0, 3 - centerDistance * 0.1);
}

/**
 * Evalúa el valor de una pieza capturada
 * @param pieceType - Tipo de pieza a evaluar
 * @returns Valor numérico de la pieza
 */
export function getPieceValue(pieceType: PieceType): number {
  return PIECE_VALUES[pieceType] || 0;
}


/**
 * Crea un tablero vacío de ajedrez
 * @returns Tablero de 8x8 inicializado con casillas vacías
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
