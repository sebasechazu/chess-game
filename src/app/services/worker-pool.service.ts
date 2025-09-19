import { Injectable, signal, computed } from '@angular/core';
import {
  ChessSquare,
  AiMove,
  Position,
  PieceColor
} from '../helpers/interfaces';
import { getAllPiecesForColor } from '../helpers/chess-core-utils';
import { 
  getPieceAtPosition, 
  positionToCoordinates, 
  isValidMove 
} from '../helpers/chess-basic-validation';

/**
 * Interface para el estado de un worker individual
 */
interface WorkerState {
  worker: Worker;
  isBusy: boolean;
  currentTask?: string;
}

/**
 * Interface para tareas divididas que se envían a workers
 */
interface PartialTask {
  id: string;
  moves: AiMove[];
  board: ChessSquare[][];
  depth: number;
}

/**
 * Servicio que gestiona un pool de Web Workers para distribuir la carga de la IA
 * Permite paralelizar el cálculo de movimientos para mejorar el rendimiento
 */
@Injectable({ providedIn: 'root' })
export class WorkerPoolService {
  private workers: WorkerState[] = [];
  private readonly maxWorkers: number;
  private workerPromises = new Map<string, { resolve: Function; reject: Function }>();
  private messageId = 0;

  // Signals para el estado del pool
  public readonly activeWorkers = signal(0);
  public readonly totalWorkers = signal(0);
  public readonly isProcessing = signal(false);

  // Computed para información del pool
  public readonly poolStatus = computed(() => {
    const active = this.activeWorkers();
    const total = this.totalWorkers();
    if (active === 0) {
      return `Pool: ${total} workers disponibles`;
    }
    return `Pool: ${active}/${total} workers activos`;
  });

  constructor() {
    // Determinar número óptimo de workers basado en CPU cores
    this.maxWorkers = Math.max(2, Math.min(navigator.hardwareConcurrency || 4, 8));
    this.initializeWorkerPool();
  }

  /**
   * Inicializa el pool de workers
   */
  private initializeWorkerPool(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers no están disponibles');
      return;
    }

    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(new URL('../workers/ai.worker', import.meta.url));
        
        const workerState: WorkerState = {
          worker,
          isBusy: false
        };

        worker.onmessage = (event) => this.handleWorkerMessage(event, i);
        worker.onerror = (error) => this.handleWorkerError(error, i);

        this.workers.push(workerState);
      } catch (error) {
        console.error(`Error creando worker ${i}:`, error);
      }
    }

    this.totalWorkers.set(this.workers.length);
    console.log(`Pool de workers inicializado con ${this.workers.length} workers`);
  }

  /**
   * Maneja mensajes de los workers
   */
  private handleWorkerMessage(event: MessageEvent, workerIndex: number): void {
    const { type, move, moves, error, messageId } = event.data;
    
    if (messageId && this.workerPromises.has(messageId)) {
      const promise = this.workerPromises.get(messageId)!;
      this.workerPromises.delete(messageId);

      // Liberar el worker
      if (this.workers[workerIndex]) {
        this.workers[workerIndex].isBusy = false;
        this.workers[workerIndex].currentTask = undefined;
        this.updateActiveWorkers();
      }

      if (type === 'bestMove') {
        promise.resolve(move);
      } else if (type === 'bestMoves') {
        promise.resolve(moves);
      } else if (type === 'error') {
        promise.reject(new Error(error));
      }
    }
  }

  /**
   * Maneja errores de los workers
   */
  private handleWorkerError(error: ErrorEvent, workerIndex: number): void {
    console.error(`Error en worker ${workerIndex}:`, error);
    
    // Liberar el worker con error
    if (this.workers[workerIndex]) {
      this.workers[workerIndex].isBusy = false;
      this.workers[workerIndex].currentTask = undefined;
      this.updateActiveWorkers();
    }

    // Rechazar promesas pendientes de este worker
    for (const [messageId, promise] of this.workerPromises.entries()) {
      if (messageId.includes(`_w${workerIndex}_`)) {
        promise.reject(new Error('Worker error'));
        this.workerPromises.delete(messageId);
      }
    }
  }

  /**
   * Encuentra el mejor movimiento distribuyendo la carga entre workers
   */
  public async findBestMove(board: ChessSquare[][]): Promise<AiMove | null> {
    if (this.workers.length === 0) {
      throw new Error('No hay workers disponibles');
    }

    this.isProcessing.set(true);

    try {
      // Agregar timeout para evitar bloqueos
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: IA tardó demasiado')), 30000); // 30 segundos
      });

      const calculationPromise = this.performCalculation(board);
      
      // Race entre cálculo y timeout
      const result = await Promise.race([calculationPromise, timeoutPromise]);
      return result;

    } catch (error) {
      console.error('Error en cálculo de IA:', error);
      throw error;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Realiza el cálculo real del movimiento
   */
  private async performCalculation(board: ChessSquare[][]): Promise<AiMove | null> {
    // Obtener todos los movimientos posibles para las piezas negras
    const allPossibleMoves = this.getAllPossibleMoves(board);
    
    if (allPossibleMoves.length === 0) {
      return null;
    }

    // Si hay pocos movimientos, usar un solo worker
    if (allPossibleMoves.length <= 8) {
      return await this.processSingleWorker(board);
    }

    // Dividir movimientos entre workers disponibles
    const results = await this.processMultipleWorkers(board, allPossibleMoves);
    
    // Encontrar el mejor movimiento de todos los resultados
    return this.findBestFromResults(results);
  }

  /**
   * Obtiene todos los movimientos posibles para las piezas negras
   */
  private getAllPossibleMoves(board: ChessSquare[][]): AiMove[] {
    const blackPieces = getAllPiecesForColor(board, PieceColor.Black);
    const possibleMoves: AiMove[] = [];

    for (const piecePos of blackPieces) {
      const validMoves = this.getValidMovesForPiece(board, piecePos);
      for (const targetPos of validMoves) {
        possibleMoves.push({ from: piecePos, to: targetPos, score: 0 });
      }
    }

    return possibleMoves;
  }

  /**
   * Procesa usando un solo worker (para casos simples)
   */
  private async processSingleWorker(board: ChessSquare[][]): Promise<AiMove | null> {
    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) {
      throw new Error('No hay workers disponibles');
    }

    const messageId = `single_${++this.messageId}_w${this.workers.indexOf(availableWorker)}`;
    
    const promise = new Promise<AiMove | null>((resolve, reject) => {
      this.workerPromises.set(messageId, { resolve, reject });
    });

    availableWorker.isBusy = true;
    availableWorker.currentTask = 'findBestMove';
    this.updateActiveWorkers();

    availableWorker.worker.postMessage({
      type: 'findBestMove',
      board: this.cloneBoard(board),
      messageId
    });

    return promise;
  }

  /**
   * Procesa usando múltiples workers dividiendo la carga
   */
  private async processMultipleWorkers(board: ChessSquare[][], allMoves: AiMove[]): Promise<AiMove[]> {
    const availableWorkers = this.getAvailableWorkers();
    const numWorkers = Math.min(availableWorkers.length, allMoves.length);
    
    if (numWorkers === 0) {
      throw new Error('No hay workers disponibles');
    }

    // Dividir movimientos entre workers
    const movesPerWorker = Math.ceil(allMoves.length / numWorkers);
    const tasks: Promise<AiMove[]>[] = [];

    for (let i = 0; i < numWorkers; i++) {
      const startIndex = i * movesPerWorker;
      const endIndex = Math.min(startIndex + movesPerWorker, allMoves.length);
      const movesToProcess = allMoves.slice(startIndex, endIndex);

      if (movesToProcess.length > 0) {
        const worker = availableWorkers[i];
        const task = this.processMovesInWorker(worker, board, movesToProcess, i);
        tasks.push(task);
      }
    }

    const results = await Promise.all(tasks);
    return results.flat();
  }

  /**
   * Procesa un conjunto de movimientos en un worker específico
   */
  private async processMovesInWorker(
    workerState: WorkerState, 
    board: ChessSquare[][], 
    moves: AiMove[], 
    workerIndex: number
  ): Promise<AiMove[]> {
    const messageId = `batch_${++this.messageId}_w${workerIndex}`;
    
    const promise = new Promise<AiMove[]>((resolve, reject) => {
      this.workerPromises.set(messageId, { resolve, reject });
    });

    workerState.isBusy = true;
    workerState.currentTask = `processing ${moves.length} moves`;
    this.updateActiveWorkers();

    workerState.worker.postMessage({
      type: 'evaluateMoves',
      board: this.cloneBoard(board),
      moves: moves,
      messageId
    });

    return promise;
  }

  /**
   * Encuentra el mejor movimiento de todos los resultados
   */
  private findBestFromResults(results: AiMove[]): AiMove | null {
    if (results.length === 0) return null;

    return results.reduce((best, current) => {
      return current.score > best.score ? current : best;
    });
  }

  /**
   * Obtiene un worker disponible
   */
  private getAvailableWorker(): WorkerState | null {
    return this.workers.find(w => !w.isBusy) || null;
  }

  /**
   * Obtiene todos los workers disponibles
   */
  private getAvailableWorkers(): WorkerState[] {
    return this.workers.filter(w => !w.isBusy);
  }

  /**
   * Actualiza el contador de workers activos
   */
  private updateActiveWorkers(): void {
    const active = this.workers.filter(w => w.isBusy).length;
    this.activeWorkers.set(active);
  }

  /**
   * Obtiene movimientos válidos para una pieza
   */
  private getValidMovesForPiece(board: ChessSquare[][], position: Position): Position[] {
    const validMoves: Position[] = [];
    const piece = getPieceAtPosition(board, position);
    if (!piece) return validMoves;

    const fromCoords = positionToCoordinates(position);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const targetPosition = `${String.fromCharCode(97 + col)}${8 - row}`;
        if (position === targetPosition) continue;

        if (isValidMove(board, piece, [fromCoords.row, fromCoords.col], [row, col])) {
          validMoves.push(targetPosition);
        }
      }
    }

    return validMoves;
  }

  /**
   * Clona el tablero de forma segura
   */
  private cloneBoard(board: ChessSquare[][]): ChessSquare[][] {
    return board.map(row => 
      row.map(square => ({
        ...square,
        piece: square.piece ? { ...square.piece } : null
      }))
    );
  }

  /**
   * Limpia el cache de todos los workers
   */
  public clearCache(): void {
    this.workers.forEach(workerState => {
      if (!workerState.isBusy) {
        workerState.worker.postMessage({ type: 'clearCache' });
      }
    });
  }

  /**
   * Obtiene información del estado del pool
   */
  public getPoolInfo(): {
    totalWorkers: number;
    activeWorkers: number;
    isProcessing: boolean;
    status: string;
  } {
    return {
      totalWorkers: this.totalWorkers(),
      activeWorkers: this.activeWorkers(),
      isProcessing: this.isProcessing(),
      status: this.poolStatus()
    };
  }

  /**
   * Destruye todos los workers cuando el servicio se destruye
   */
  public ngOnDestroy(): void {
    this.workers.forEach(workerState => {
      workerState.worker.terminate();
    });
    this.workers = [];
    this.workerPromises.clear();
    this.totalWorkers.set(0);
    this.activeWorkers.set(0);
  }
}