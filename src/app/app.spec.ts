import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideNoopAnimations()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const compiled = fixture.nativeElement as HTMLElement;
  // verificar que el componente principal del juego esté presente
  expect(compiled.querySelector('app-chess-game')).toBeTruthy();
  });
});
