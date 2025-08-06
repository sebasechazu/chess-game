import { Component, OnInit, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { ModalGameComponent } from '../shared/modal-game/modal-game.component';

interface ChessPiece {
  id: number;
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  position: string; // Notación algebraica: 'a1', 'e4', etc.
  image: string;
  hasMoved?: boolean; // Para reglas como enroque o movimiento inicial de peones
}

interface ChessSquare {
  position: string; // 'a1', 'h8', etc.
  color: 'light' | 'dark';
  piece: ChessPiece | null;
}

@Component({
  selector: 'app-chess-game',
  templateUrl: './chess-game.component.html',
  styleUrls: ['./chess-game.component.css'],
  standalone: true,
  imports: [CommonModule, DragDropModule, ChessPieceComponent, ModalGameComponent]
})
export class ChessGameComponent implements OnInit {
  private elementRef = inject(ElementRef);
  
  // Signals para el estado del juego
  board = signal<ChessSquare[][]>([]);
  selectedPiece = signal<ChessPiece | null>(null);
  currentTurn = signal<'white' | 'black'>('white');
  gameOver = signal<boolean>(false);
  winnerColor = signal<'white' | 'black' | 'draw' | null>(null);
  showVictoryModal = signal<boolean>(false);
  gameInitialized = signal<boolean>(false);
  showInitialAnimations = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  
  // Variables para mejorar scroll en móviles
  private isDragging = false;
  private scrollContainer: HTMLElement | null = null;
  private isScrolling = false;
  private scrollTimeout: any;
  private lastTouchY = 0;
  
  // Historial de movimientos
  moveHistory = signal<string[]>([]);
  
  // Estadísticas
  totalMovements = signal<number>(0);
  whiteCaptures = signal<number>(0);
  blackCaptures = signal<number>(0);
  

  
  ngOnInit(): void {
    this.initializeGame();
    this.setupMobileScrollOptimization();
  }
  
  private setupMobileScrollOptimization(): void {
    // Detectar si es dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768;
    
    if (!isMobile) return; // Solo aplicar optimizaciones en móviles
    
    // Encontrar el contenedor principal de scroll
    this.scrollContainer = this.elementRef.nativeElement.closest('.mobile-grid-container') || 
                          document.querySelector('.mobile-grid-container') ||
                          document.documentElement;

    // Agregar listeners para mejorar el scroll en móviles
    if (this.scrollContainer) {
      // Passive listeners para mejor rendimiento
      this.scrollContainer.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
      this.scrollContainer.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
      this.scrollContainer.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
      
      // Optimizar el scroll para touch devices desde el inicio
      this.scrollContainer.style.overflowY = 'auto';
      (this.scrollContainer.style as any).webkitOverflowScrolling = 'touch';
      this.scrollContainer.style.scrollBehavior = 'auto'; // Scroll rápido por defecto
      
      // Preparar body para scroll ultra-rápido
      document.body.style.overscrollBehavior = 'auto';
      (document.body.style as any).webkitOverflowScrolling = 'touch';
      
      // Eliminar cualquier interferencia de CSS
      document.body.style.touchAction = 'manipulation';
    }
    
    console.log('Mobile scroll optimizations initialized - smart drag/scroll detection enabled');
  }

  private onTouchStart(event: TouchEvent): void {
    // Detectar si el touch está en una tarjeta arrastrable
    const target = event.target as Element;
    const isDragElement = target.closest('[cdkDrag]');
    
    if (isDragElement) {
      this.isDragging = false; // Reset dragging state
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    const currentY = event.touches[0].clientY;
    const deltaY = Math.abs(currentY - this.lastTouchY);
    
    // Si se mueve verticalmente más de 10px, es scroll, no drag
    if (deltaY > 10 && !this.isDragging) {
      this.isScrolling = true;
      
      // Clear previous timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      
      // Re-enable drag after scroll stops
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 150);
    }
    
    this.lastTouchY = currentY;
  }

  private onTouchEnd(event: TouchEvent): void {
    this.isDragging = false;
    
    // Re-enable drag after a short delay
    setTimeout(() => {
      if (!this.isScrolling) {
        // this.enableDrag(); // Comentado temporalmente
      }
    }, 100);
  }

  private disableDragTemporarily(): void {
    // Comentado temporalmente para debugging
    /*
    const dragElements = document.querySelectorAll('[cdkDrag]');
    dragElements.forEach(element => {
      (element as HTMLElement).style.pointerEvents = 'none';
      element.setAttribute('data-drag-disabled', 'true');
    });
    */
  }

  private enableDrag(): void {
    // Comentado temporalmente para debugging
    /*
    const dragElements = document.querySelectorAll('[cdkDrag]');
    dragElements.forEach(element => {
      (element as HTMLElement).style.pointerEvents = '';
      element.removeAttribute('data-drag-disabled');
    });
    */
  }
  
  private initializeGame(): void {
    this.isLoading.set(true);
    
    // Crear tablero vacío 8x8
    const newBoard: ChessSquare[][] = [];
    
    for (let row = 0; row < 8; row++) {
      const boardRow: ChessSquare[] = [];
      
      for (let col = 0; col < 8; col++) {
        const file = String.fromCharCode(97 + col); // 'a' hasta 'h'
        const rank = 8 - row; // 8 hasta 1
        const position = `${file}${rank}`;
        
        boardRow.push({
          position,
          color: (row + col) % 2 === 0 ? 'light' : 'dark',
          piece: null
        });
      }
      
      newBoard.push(boardRow);
    }
    
    // Colocar piezas en el tablero
    this.setupInitialPosition(newBoard);
    
    this.board.set(newBoard);
    this.currentTurn.set('white');
    this.gameOver.set(false);
    this.isLoading.set(false);
    this.gameInitialized.set(true);
    this.moveHistory.set([]);
    
    // Activar animaciones de entrada solo en la primera carga
    this.showInitialAnimations.set(true);
    
    // Desactivar las animaciones después de que se ejecuten
    setTimeout(() => {
      this.showInitialAnimations.set(false);
    }, 2000);
    
    // Reset contadores
    this.totalMovements.set(0);
    this.whiteCaptures.set(0);
    this.blackCaptures.set(0);
  }
  
  private setupInitialPosition(board: ChessSquare[][]): void {
    // Configuración de piezas blancas
    this.placePiece(board, 'a1', { id: 1, type: 'rook', color: 'white', position: 'a1', image: 'assets/img/chess/white-rook.svg' });
    this.placePiece(board, 'b1', { id: 2, type: 'knight', color: 'white', position: 'b1', image: 'assets/img/chess/white-knight.svg' });
    this.placePiece(board, 'c1', { id: 3, type: 'bishop', color: 'white', position: 'c1', image: 'assets/img/chess/white-bishop.svg' });
    this.placePiece(board, 'd1', { id: 4, type: 'queen', color: 'white', position: 'd1', image: 'assets/img/chess/white-queen.svg' });
    this.placePiece(board, 'e1', { id: 5, type: 'king', color: 'white', position: 'e1', image: 'assets/img/chess/white-king.svg' });
    this.placePiece(board, 'f1', { id: 6, type: 'bishop', color: 'white', position: 'f1', image: 'assets/img/chess/white-bishop.svg' });
    this.placePiece(board, 'g1', { id: 7, type: 'knight', color: 'white', position: 'g1', image: 'assets/img/chess/white-knight.svg' });
    this.placePiece(board, 'h1', { id: 8, type: 'rook', color: 'white', position: 'h1', image: 'assets/img/chess/white-rook.svg' });
    
    // Peones blancos
    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      this.placePiece(board, `${file}2`, {
        id: 9 + col,
        type: 'pawn',
        color: 'white',
        position: `${file}2`,
        image: 'assets/img/chess/white-pawn.svg'
      });
    }
    
    // Configuración de piezas negras
    this.placePiece(board, 'a8', { id: 17, type: 'rook', color: 'black', position: 'a8', image: 'assets/img/chess/black-rook.svg' });
    this.placePiece(board, 'b8', { id: 18, type: 'knight', color: 'black', position: 'b8', image: 'assets/img/chess/black-knight.svg' });
    this.placePiece(board, 'c8', { id: 19, type: 'bishop', color: 'black', position: 'c8', image: 'assets/img/chess/black-bishop.svg' });
    this.placePiece(board, 'd8', { id: 20, type: 'queen', color: 'black', position: 'd8', image: 'assets/img/chess/black-queen.svg' });
    this.placePiece(board, 'e8', { id: 21, type: 'king', color: 'black', position: 'e8', image: 'assets/img/chess/black-king.svg' });
    this.placePiece(board, 'f8', { id: 22, type: 'bishop', color: 'black', position: 'f8', image: 'assets/img/chess/black-bishop.svg' });
    this.placePiece(board, 'g8', { id: 23, type: 'knight', color: 'black', position: 'g8', image: 'assets/img/chess/black-knight.svg' });
    this.placePiece(board, 'h8', { id: 24, type: 'rook', color: 'black', position: 'h8', image: 'assets/img/chess/black-rook.svg' });
    
    // Peones negros
    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      this.placePiece(board, `${file}7`, {
        id: 25 + col,
        type: 'pawn',
        color: 'black',
        position: `${file}7`,
        image: 'assets/img/chess/black-pawn.svg'
      });
    }
  }
  
  private placePiece(board: ChessSquare[][], position: string, piece: ChessPiece): void {
    const [file, rank] = position.split('');
    const col = file.charCodeAt(0) - 97; // 'a' es 0
    const row = 8 - parseInt(rank);
    
    if (board[row] && board[row][col]) {
      board[row][col].piece = piece;
    }
  }
  
  // Método para manejar el drag and drop
  onPieceDrop(event: CdkDragDrop<ChessSquare>): void {
    console.log('========== EVENTO DE DROP RECIBIDO ==========');
    console.log('Evento completo:', event);
    
    try {
      // Verificar si es el mismo contenedor (no hay movimiento)
      if (event.previousContainer === event.container) {
        console.log('Misma casilla, no hay movimiento');
        return;
      }
      
      // Obtener datos de los contenedores
      const sourceSquare = event.previousContainer.data;
      const targetSquare = event.container.data;
      
      if (!sourceSquare || !targetSquare) {
        console.error('Error: Datos de casillas no disponibles');
        return;
      }
      
      const sourcePosition = sourceSquare.position;
      const targetPosition = targetSquare.position;
      
      console.log(`Intento de movimiento: ${sourcePosition} -> ${targetPosition}`);
      
      // Obtener la pieza desde la casilla de origen
      const movingPiece = sourceSquare.piece;
      
      if (!movingPiece) {
        console.error('No hay pieza para mover en la casilla de origen');
        return;
      }
      
      // Verificar si es el turno del jugador
      if (movingPiece.color !== this.currentTurn()) {
        console.error('No es el turno de esta pieza');
        return;
      }
      
      // Obtener el tablero actual
      const currentBoard = [...this.board()];
      
      // Encontrar las posiciones en el tablero
      const [sourceFile, sourceRank] = sourcePosition.split('');
      const sourceCol = sourceFile.charCodeAt(0) - 97;
      const sourceRow = 8 - parseInt(sourceRank);
      
      const [targetFile, targetRank] = targetPosition.split('');
      const targetCol = targetFile.charCodeAt(0) - 97;
      const targetRow = 8 - parseInt(targetRank);
      
      console.log(`Índices origen: [${sourceRow}, ${sourceCol}], destino: [${targetRow}, ${targetCol}]`);
      console.log('Pieza a mover:', movingPiece);
      
      // Verificar si el movimiento es legal
      if (this.isLegalMove(currentBoard, sourcePosition, targetPosition)) {
        console.log('Movimiento legal detectado');
        
        // Registrar captura si hay una pieza en el destino
        const targetPiece = currentBoard[targetRow][targetCol].piece;
        if (targetPiece) {
          console.log('Captura:', targetPiece);
          if (targetPiece.color === 'black') {
            this.whiteCaptures.update(count => count + 1);
          } else {
            this.blackCaptures.update(count => count + 1);
          }
        }
        
        // Limpiar efectos visuales
        document.querySelectorAll('.chess-square-hover').forEach(el => {
          el.classList.remove('chess-square-hover');
        });
        
        // Realizar el movimiento en el modelo de datos
        this.movePiece(currentBoard, sourcePosition, targetPosition);
        
        // Incrementar total de movimientos
        this.totalMovements.update(count => count + 1);
        
        // Cambiar el turno
        this.currentTurn.update(turn => turn === 'white' ? 'black' : 'white');
        
        // Actualizar el tablero
        this.board.set([...currentBoard]);
        
        // Verificar si el juego terminó
        this.checkGameStatus();
        
        console.log('Movimiento completado con éxito');
      } else {
        console.error('Movimiento ilegal');
      }
    } catch (error) {
      console.error('Error al procesar el drop:', error);
    }
  }
  
  // Método simplificado para verificar si un movimiento es legal
  private isLegalMove(board: ChessSquare[][], sourcePos: string, targetPos: string): boolean {
    const [sourceFile, sourceRank] = sourcePos.split('');
    const sourceCol = sourceFile.charCodeAt(0) - 97;
    const sourceRow = 8 - parseInt(sourceRank);
    
    const [targetFile, targetRank] = targetPos.split('');
    const targetCol = targetFile.charCodeAt(0) - 97;
    const targetRow = 8 - parseInt(targetRank);
    
    const piece = board[sourceRow][sourceCol].piece;
    const targetSquare = board[targetRow][targetCol];
    
    // No permitir capturar piezas propias
    if (targetSquare.piece && targetSquare.piece.color === piece?.color) {
      return false;
    }
    
    // Implementación básica - todas las piezas pueden moverse a cualquier casilla
    // En un juego real, aquí se verificarían las reglas específicas para cada tipo de pieza
    return true;
  }
  
  // Método para mover una pieza en el tablero
  private movePiece(board: ChessSquare[][], sourcePos: string, targetPos: string): void {
    const [sourceFile, sourceRank] = sourcePos.split('');
    const sourceCol = sourceFile.charCodeAt(0) - 97;
    const sourceRow = 8 - parseInt(sourceRank);
    
    const [targetFile, targetRank] = targetPos.split('');
    const targetCol = targetFile.charCodeAt(0) - 97;
    const targetRow = 8 - parseInt(targetRank);
    
    // Obtener la pieza y actualizar su posición
    const piece = board[sourceRow][sourceCol].piece;
    
    if (piece) {
      piece.position = targetPos;
      piece.hasMoved = true;
      
      // Registrar el movimiento
      const capturedPiece = board[targetRow][targetCol].piece;
      const moveNotation = this.generateMoveNotation(piece, sourcePos, targetPos, capturedPiece);
      this.moveHistory.update(history => [...history, moveNotation]);
      
      // Mover la pieza
      board[targetRow][targetCol].piece = piece;
      board[sourceRow][sourceCol].piece = null;
    }
  }
  
  // Método para generar la notación del movimiento
  private generateMoveNotation(piece: ChessPiece, sourcePos: string, targetPos: string, capturedPiece: ChessPiece | null): string {
    const pieceSymbols: Record<string, string> = {
      'king': 'K',
      'queen': 'Q',
      'rook': 'R',
      'bishop': 'B',
      'knight': 'N',
      'pawn': ''
    };
    
    const symbol = pieceSymbols[piece.type];
    const capture = capturedPiece ? 'x' : '';
    
    return `${symbol}${sourcePos}${capture}${targetPos}`;
  }
  
  // Verificar el estado del juego (jaque mate, tablas, etc.)
  private checkGameStatus(): void {
    // Implementación simplificada para la demo
    // En un juego real verificarías jaque, jaque mate, tablas, etc.
    
    // Por ejemplo, si el rey negro o blanco ha sido capturado
    const currentBoard = this.board();
    let whiteKingExists = false;
    let blackKingExists = false;
    
    for (const row of currentBoard) {
      for (const square of row) {
        if (square.piece?.type === 'king') {
          if (square.piece.color === 'white') {
            whiteKingExists = true;
          } else {
            blackKingExists = true;
          }
        }
      }
    }
    
    if (!whiteKingExists) {
      this.gameOver.set(true);
      this.winnerColor.set('black');
      this.showVictoryModal.set(true);
    } else if (!blackKingExists) {
      this.gameOver.set(true);
      this.winnerColor.set('white');
      this.showVictoryModal.set(true);
    }
  }
  
  // Método para reiniciar el juego
  resetGame(): void {
    this.initializeGame();
  }
  
  closeVictoryModal(): void {
    this.showVictoryModal.set(false);
  }
  
  // Método para determinar el color de una casilla
  getSquareClass(square: ChessSquare): string {
    const baseClass = 'chess-square w-full h-full flex justify-center items-center';
    const colorClass = square.color === 'light' ? 'bg-amber-200' : 'bg-amber-800';
    
    // Agregar clase adicional si la casilla está resaltada
    const highlightClass = this.isHighlighted(square.position) ? 'chess-highlighted' : '';
    
    return `${baseClass} ${colorClass} ${highlightClass}`;
  }
  
  // Método para resaltar casillas válidas
  isHighlighted(position: string): boolean {
    // Implementación para resaltar movimientos válidos
    return false;
  }
  
  // Método para generar las clases de animación de estadísticas
  getStatsAnimationClass(): string {
    if (!this.showInitialAnimations()) {
      return ''; // No aplicar animaciones después de la carga inicial
    }
    return 'stagger-item status-stats';
  }
  
  // Método para manejar cuando se entra a una zona de drop
  onDragEntered(event: any): void {
    console.log('Entrando en zona de drop:', event.container.data.position);
    const dropListElement = event.container.element.nativeElement;
    dropListElement.classList.add('chess-square-hover');
    
    // También aplicar la clase al elemento hijo chess-square
    const chessSquare = dropListElement.querySelector('.chess-square');
    if (chessSquare) {
      chessSquare.classList.add('chess-square-hover');
    }
  }

  // Método para manejar cuando se sale de una zona de drop
  onDragExited(event: any): void {
    console.log('Saliendo de zona de drop:', event.container.data.position);
    const dropListElement = event.container.element.nativeElement;
    dropListElement.classList.remove('chess-square-hover');
    
    // También quitar la clase al elemento hijo chess-square
    const chessSquare = dropListElement.querySelector('.chess-square');
    if (chessSquare) {
      chessSquare.classList.remove('chess-square-hover');
    }
  }

  // Métodos para mejorar el comportamiento de drag en móviles
  onDragStarted(event: any): void {
    console.log('Drag iniciado:', event);
    this.isDragging = true;
    this.isScrolling = false;
    
    // Asegurarnos que el elemento de arrastre sea del tamaño adecuado
    const preview = document.querySelector('.cdk-drag-preview');
    if (preview) {
      (preview as HTMLElement).style.width = '50px';
      (preview as HTMLElement).style.height = '50px';
      (preview as HTMLElement).style.zIndex = '9999';
      // Permitir eventos del puntero en el preview para mejorar el arrastre
      (preview as HTMLElement).style.pointerEvents = 'auto';
      // Asegurar que sea visible
      (preview as HTMLElement).style.opacity = '0.9';
    }
    
    // Resaltar todas las casillas como posibles destinos
    const boardSquares = document.querySelectorAll('.chess-square-container');
    boardSquares.forEach(square => {
      square.classList.add('possible-drop-target');
    });
    
    console.log('Drag iniciado completamente');
  }

  onDragEnded(event: any): void {
    console.log('Drag finalizado:', event);
    this.isDragging = false;
    
    // Quitar resaltado de casillas
    const boardSquares = document.querySelectorAll('.chess-square-container');
    boardSquares.forEach(square => {
      square.classList.remove('possible-drop-target');
      square.classList.remove('chess-square-hover');
    });
    
    // Eliminar cualquier elemento de vista previa que pudiera quedar
    setTimeout(() => {
      const previews = document.querySelectorAll('.cdk-drag-preview');
      previews.forEach(preview => {
        (preview as HTMLElement).remove();
      });
    }, 50);
    
    console.log('Drag finalizado completamente');
  }
}
