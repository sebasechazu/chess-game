import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AiService } from './ai.service';
import { createEmptyBoard } from '../helpers/chess-utils';

describe('AiService (basic)', () => {
  let service: AiService;

  beforeEach(() => {
  TestBed.configureTestingModule({ providers: [AiService, provideZonelessChangeDetection()] });
    service = TestBed.inject(AiService);
  });

  it('should return empty moves for empty board', () => {
    const board = createEmptyBoard();
    const moves = service.getValidMovesForPieceWithRules(board, 'a1');
    expect(moves).toEqual([]);
  });

  it('findBestMove should return null on empty board', () => {
    const board = createEmptyBoard();
    const best = service.findBestMove(board, 2);
    expect(best).toBeNull();
  });
});
