import { ChessPiece } from "./chess-piece.interface";

export interface ChessSquare {
  position: string;
  color: 'light' | 'dark';
  piece: ChessPiece | null;
}