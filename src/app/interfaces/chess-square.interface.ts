import { ChessPiece } from "./chess-piece.interface";

export enum SquareColor {
  Light = 'light',
  Dark = 'dark'
}

export interface ChessSquare {
  position: string;
  color: SquareColor;
  piece: ChessPiece | null;
}