import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppService } from './app.service';
import { AiService } from './ai.service';

describe('AppService (basic)', () => {
  let service: AppService;

  beforeEach(() => {
  TestBed.configureTestingModule({ providers: [AppService, AiService, provideZonelessChangeDetection()] });
    service = TestBed.inject(AppService);
  });

  it('should initialize game and set board', () => {
    service.initializeGame();
    const board = service.board();
    expect(board.length).toBe(8);
    expect(service.gameInitialized()).toBeTrue();
  });

  it('should perform a simple pawn move', () => {
    service.initializeGame();
    const res = service.makeMove('a2', 'a3');
    expect(res.success).toBeTrue();
    // la pieza en a3 debe ser un pawn blanco
    const piece = service.board().find(r => r.some(s => s.position === 'a3' && s.piece))?.find(s => s.position === 'a3')?.piece;
    expect(piece).toBeTruthy();
    expect(piece?.type).toBeDefined();
  });
});
