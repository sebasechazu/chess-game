export interface ChessPiece {
  id: number;
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  position: string;
  image?: string;
  hasMoved?: boolean;
}