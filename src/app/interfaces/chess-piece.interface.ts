export enum PieceType {
  King = 'king',
  Queen = 'queen',
  Rook = 'rook',
  Bishop = 'bishop',
  Knight = 'knight',
  Pawn = 'pawn'
}

export enum PieceColor {
  White = 'white',
  Black = 'black'
}

export interface ChessPiece {
  id: number;
  type: PieceType;
  color: PieceColor;
  position: string;
  image?: string;
  hasMoved?: boolean;
}