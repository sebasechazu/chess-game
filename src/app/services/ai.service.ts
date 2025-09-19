/**
 * Servicio optimizado responsable de la lógica de IA usando Pool de Web Workers
 * Incluye cache de resultados, manejo robusto de errores y métricas de performance
 */
import { Injectable, signal, computed, inject, OnDestroy, effect } from '@angular/core';
import { ChessSquare, AiMove } from '../helpers/interfaces';
import { WorkerPoolService } from './worker-pool.service';

/**
 * Tipos de errores específicos para el servicio de IA
 */
export enum AiErrorType {
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  INVALID_BOARD = 'INVALID_BOARD',
  WORKER_CRASHED = 'WORKER_CRASHED',
  CACHE_ERROR = 'CACHE_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED'
}

/**
 * Error personalizado para operaciones de IA
 */
export class AiError extends Error {
  constructor(
    message: string,
    public readonly type: AiErrorType,
    public readonly attempt: number = 0,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/**
 * Interface para el resultado del movimiento con métricas
 * Incluye si el resultado vino de cache
 */
export interface AiMoveResult {
  move: AiMove | null;
  executionTime: number;
  fromCache: boolean;
}

/**
 * Interface para información de estado de la IA
 * Incluye métricas de performance
 */
export interface AiStatusInfo {
  isProcessing: boolean;
  lastMoveTime: number;
  status: string;
  cacheSize: number;
  successRate: number;
}

@Injectable({ providedIn: 'root' })
export class AiService implements OnDestroy {
  private readonly workerPool = inject(WorkerPoolService);

  // Constantes de configuración
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_EXPIRATION_MS = 300000; // 5 minutos
  private readonly DEFAULT_MAX_RETRIES = 2;
  private readonly BACKOFF_BASE_DELAY = 1000;
  private readonly CACHE_CLEANUP_PERCENTAGE = 0.25;
  private readonly DEFAULT_SUCCESS_RATE = 100;

  // Cache para resultados de movimientos (usando hash del tablero como clave)
  private readonly moveCache = new Map<string, { move: AiMove; timestamp: number }>();

  // Signals para el estado de la IA
  public readonly isProcessing = signal(false);
  public readonly lastMoveTime = signal(0);
  
  // Signals para optimizar computed
  private readonly poolWorkers = signal(0);
  private readonly cacheSize = signal(0);

  // Métricas de performance como signals
  private readonly moveCount = signal(0);
  private readonly cacheHits = signal(0);
  private readonly errorCount = signal(0);

  // Computed para tasa de éxito reactiva
  public readonly successRate = computed(() => {
    const total = this.moveCount();
    const errors = this.errorCount();
    return total > 0 ? Math.round(((total - errors) / total) * 100) : this.DEFAULT_SUCCESS_RATE;
  });

  // Computed optimizado para mostrar información del estado
  public readonly aiStatus = computed(() => {
    if (this.isProcessing()) {
      return 'Analizando posición...';
    }
    const workers = this.poolWorkers();
    const cache = this.cacheSize();
    const cacheInfo = cache > 0 ? ` | Cache: ${cache}` : '';
    return `IA Lista (${workers} workers${cacheInfo})`;
  });

  constructor() {
    // Inicializar señales con valores actuales
    this.updatePoolWorkers();
    this.updateCacheSize();
    
    // Effect para actualizar poolWorkers cuando cambie el pool
    effect(() => {
      this.updatePoolWorkers();
    });
  }

  /**
   * Actualiza la señal de poolWorkers
   */
  private updatePoolWorkers(): void {
    try {
      const poolInfo = this.workerPool.getPoolInfo();
      this.poolWorkers.set(poolInfo.totalWorkers);
    } catch (error) {
      // Fallar silenciosamente en caso de error
      this.poolWorkers.set(0);
    }
  }

  /**
   * Actualiza la señal de cacheSize
   */
  private updateCacheSize(): void {
    this.cacheSize.set(this.moveCache.size);
  }

  /**
   * Encuentra el mejor movimiento usando cache y Pool de Web Workers
   * Incluye fallback automático, métricas de performance y soporte para cancelación
   */
  public async findBestMove(
    board: ChessSquare[][],
    options: {
      maxRetries?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<AiMoveResult> {
    const { maxRetries = this.DEFAULT_MAX_RETRIES, abortSignal } = options;
    
    if (abortSignal?.aborted) {
      throw new AiError('Operación cancelada', AiErrorType.OPERATION_CANCELLED);
    }

    const startTime = performance.now();

    const cacheKey = this.generateBoardHash(board);
    const cachedResult = this.getCachedMove(cacheKey);

    if (cachedResult) {
      this.cacheHits.update(hits => hits + 1);
      return {
        move: cachedResult,
        executionTime: performance.now() - startTime,
        fromCache: true
      };
    }

    this.isProcessing.set(true);
    let lastError: AiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {

      if (abortSignal?.aborted) {
        throw new AiError('Operación cancelada', AiErrorType.OPERATION_CANCELLED, attempt);
      }

      try {
        const result = await this.workerPool.findBestMove(board);

        if (abortSignal?.aborted) {
          throw new AiError('Operación cancelada', AiErrorType.OPERATION_CANCELLED, attempt);
        }

        if (result) {

          this.cacheMove(cacheKey, result);
          this.moveCount.update(count => count + 1);
        }

        const executionTime = Math.round(performance.now() - startTime);
        this.lastMoveTime.set(executionTime);

        return {
          move: result,
          executionTime,
          fromCache: false
        };

      } catch (error) {
        const originalError = error as Error;
        lastError = new AiError(
          `Intento ${attempt + 1} falló: ${originalError.message}`,
          this.categorizeError(originalError),
          attempt,
          originalError
        );
        this.errorCount.update(errors => errors + 1);

        if (attempt < maxRetries) {

          this.clearExpiredCache();
          await this.delay(this.BACKOFF_BASE_DELAY * (attempt + 1)); 
        }
      } finally {
        this.isProcessing.set(false);
      }
    }

    throw new AiError(
      `IA falló después de ${maxRetries + 1} intentos: ${lastError?.message}`,
      AiErrorType.MAX_RETRIES_EXCEEDED,
      maxRetries,
      lastError?.originalError
    );
  }

  /**
   * Categoriza errores para determinar su tipo
   * Usado para métricas y manejo específico
   */
  private categorizeError(error: Error): AiErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return AiErrorType.WORKER_TIMEOUT;
    }
    if (message.includes('board') || message.includes('invalid')) {
      return AiErrorType.INVALID_BOARD;
    }
    if (message.includes('worker') || message.includes('crashed')) {
      return AiErrorType.WORKER_CRASHED;
    }
    if (message.includes('cache')) {
      return AiErrorType.CACHE_ERROR;
    }
    if (message.includes('cancel')) {
      return AiErrorType.OPERATION_CANCELLED;
    }
    
    return AiErrorType.WORKER_CRASHED;
  }

  /**
   * Limpia el cache de movimientos y workers
   * Forzar limpieza manual si es necesario
   */
  public clearCache(): void {
    this.moveCache.clear();
    this.updateCacheSize();
    this.workerPool.clearCache();
  }

  /**
   * Obtiene información completa sobre el estado de la IA
   * Incluye estado, tamaño de cache y métricas de éxito
   */
  public getAiInfo(): AiStatusInfo {
    return {
      isProcessing: this.isProcessing(),
      lastMoveTime: this.lastMoveTime(),
      status: this.aiStatus(),
      cacheSize: this.moveCache.size,
      successRate: this.successRate()
    };
  }

  /**
   * Genera un hash optimizado del tablero para usar como clave de cache
   * @param board - Estado actual del tablero
   * @returns texto hash del tablero
   */
  private generateBoardHash(board: ChessSquare[][]): string {
    const pieces: string[] = [];
    
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const square = board[row][col];
        if (square.piece) {
          pieces.push(`${square.piece.color[0]}${square.piece.type[0]}${row}${col}`);
        }
      }
    }
    
    return pieces.join('|');
  }

  /**
   * Obtiene un movimiento del cache si existe y no ha expirado
   * @param cacheKey - Clave hash del tablero
   * @returns Movimiento de IA o null si no existe en cache o ha expirado
   */
  private getCachedMove(cacheKey: string): AiMove | null {
    const cached = this.moveCache.get(cacheKey);

    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_EXPIRATION_MS;
    if (isExpired) {
      this.moveCache.delete(cacheKey);
      return null;
    }

    return cached.move;
  }

  /**
   * Guarda un movimiento en el cache
   * @param cacheKey - Clave hash del tablero
   * @param move - Movimiento de IA a guardar
   */
  private cacheMove(cacheKey: string, move: AiMove): void {
    if (this.moveCache.size >= this.MAX_CACHE_SIZE) {
      this.clearOldestCacheEntries();
    }

    this.moveCache.set(cacheKey, {
      move,
      timestamp: Date.now()
    });
    this.updateCacheSize();
  }

  /**
   * Limpia entradas expiradas del cache
   * Se llama periódicamente para evitar crecimiento indefinido
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    let hasChanges = false;
    for (const [key, cached] of this.moveCache.entries()) {
      if (now - cached.timestamp > this.CACHE_EXPIRATION_MS) {
        this.moveCache.delete(key);
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.updateCacheSize();
    }
  }

  /**
   * Elimina las entradas más antiguas del cache cuando está lleno
   * Elimina el 25% de las entradas más antiguas
   */
  private clearOldestCacheEntries(): void {
    const entries = Array.from(this.moveCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = Math.floor(entries.length * this.CACHE_CLEANUP_PERCENTAGE);
    for (let i = 0; i < toDelete; i++) {
      this.moveCache.delete(entries[i][0]);
    }
    this.updateCacheSize();
  }

  /**
   * Utilidad para crear delays con Promise
   * @param ms - Milisegundos a esperar
   * @returns Promise que se resuelve después del delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destruye el servicio limpiando el cache y el pool de workers
   * Se llama automáticamente al destruir el inyector
   */
  public ngOnDestroy(): void {
    this.moveCache.clear();
    this.workerPool.ngOnDestroy();
  }
}
