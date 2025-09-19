import { Injectable, signal, computed, inject } from '@angular/core';
import {
  ChessSquare,
  AiMove
} from '../helpers/interfaces';
import { WorkerPoolService } from './worker-pool.service';

/**
 * Servicio responsable de la lógica de IA usando Pool de Web Workers
 * para distribuir la carga de cálculo entre múltiples hilos
 * Configurado con máxima dificultad fija
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly workerPool = inject(WorkerPoolService);

  // Signals para el estado de la IA
  public readonly isProcessing = signal(false);
  public readonly lastMoveTime = signal(0);

  // Computed para mostrar información del estado
  public readonly aiStatus = computed(() => {
    if (this.isProcessing()) {
      return 'Pensando...';
    }
    const poolInfo = this.workerPool.getPoolInfo();
    return `IA Máxima Dificultad (${poolInfo.totalWorkers} workers)`;
  });

  constructor() {
    // El worker pool se inicializa automáticamente via injection
  }

  /**
   * Encuentra el mejor movimiento usando el Pool de Web Workers
   */
  public async findBestMove(board: ChessSquare[][]): Promise<AiMove | null> {
    this.isProcessing.set(true);
    const startTime = performance.now();

    try {
      const result = await this.workerPool.findBestMove(board);
      
      const endTime = performance.now();
      this.lastMoveTime.set(Math.round(endTime - startTime));
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Limpia el cache de todos los Web Workers
   */
  public clearCache(): void {
    this.workerPool.clearCache();
  }

  /**
   * Obtiene información sobre el estado actual de la IA y el pool
   */
  public getAiInfo(): {
    isProcessing: boolean;
    lastMoveTime: number;
    status: string;
    poolInfo: {
      totalWorkers: number;
      activeWorkers: number;
      isProcessing: boolean;
      status: string;
    };
  } {
    const poolInfo = this.workerPool.getPoolInfo();
    return {
      isProcessing: this.isProcessing(),
      lastMoveTime: this.lastMoveTime(),
      status: this.aiStatus(),
      poolInfo
    };
  }

  /**
   * Destruye el pool de workers cuando el servicio se destruye
   */
  public ngOnDestroy(): void {
    this.workerPool.ngOnDestroy();
  }
}
