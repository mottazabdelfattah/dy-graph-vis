import { Injectable, ElementRef, inject } from '@angular/core';
import { Line } from '../sequence/sub-sequence/graph/line.model';
import { PLASMA_CROPPED_COLOR_SCHEME } from '../variables';
import { LINE_RENDERING_MODE } from '../sequence/sub-sequence/sub-sequence.model';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

// @Injectable({
//   providedIn: 'root',
// })
export class CanvasDrawerService {
  private context!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private http!: HttpClient;


  private workers: Worker[] = [];
  workerCount = 5;
  batchSize = 5000;
  private activeWorkers: Set<number> = new Set();

  // Clean up workers when they are no longer needed
  terminateWorkers(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
  }

  

  constructor(canvasElement: ElementRef<HTMLCanvasElement>, http: HttpClient) {
    this.http = http;
    this.canvas = canvasElement.nativeElement;
    this.context = this.canvas.getContext('2d', { willReadFrequently: true })!;

    // Instantiate Web Worker using Angular CLI support
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(
        new URL('./canvas-drawer.worker', import.meta.url)
      );
      this.workers.push(worker);
    }
  }

  drawLinesBackEnd(
    lines: Line[],
    lineWidth: number = 1.0,
    renderingMode: LINE_RENDERING_MODE,
    blendingFactor: number = 0.5
  ): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    if (renderingMode === LINE_RENDERING_MODE.NONE) {
      this.drawLinesRaw(lines, lineWidth);
    } else if (renderingMode === LINE_RENDERING_MODE.BLENDING) {
      console.log('blending mode');
      this.drawLinesBlended(lines, lineWidth, blendingFactor);
    } else if (renderingMode === LINE_RENDERING_MODE.SPLATTING) {
      const batches = this.createBatches(lines, this.batchSize);
      const requests = batches.map(batch =>
        this.getPixelDensityMap(batch, canvasWidth, canvasHeight, renderingMode, blendingFactor, lineWidth)
      );

      forkJoin(requests).subscribe(
        (responses: ArrayBuffer[]) => {
          const pixelDensityMap = new Float32Array(canvasWidth * canvasHeight);

          responses.forEach(response => {
            const map = new Float32Array(response);
            for (let i = 0; i < pixelDensityMap.length; i++) {
              pixelDensityMap[i] += map[i];
            }
          });

          this.drawPixelDensityMap(pixelDensityMap);
        },
        (error) => {
          console.error('Error:', error);
        }
      );
      
    }
  }

  drawLines(
    lines: Line[],
    lineWidth: number = 1.0,
    renderingMode: LINE_RENDERING_MODE,
    blendingFactor: number = 0.5
  ): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    if (renderingMode === LINE_RENDERING_MODE.NONE) {
      this.drawLinesRaw(lines, lineWidth);
    } else if (renderingMode === LINE_RENDERING_MODE.BLENDING) {
      console.log('blending mode');
      this.drawLinesBlended(lines, lineWidth, blendingFactor);
    } else if (renderingMode === LINE_RENDERING_MODE.SPLATTING) {
      console.log(lines.length);
      const pixelDensityMap = new Float32Array(canvasWidth * canvasHeight);
      
      const batches = this.createBatches(lines, this.batchSize);
      let remainingBatches = batches.length;

      batches.forEach((batch, index) => {
        const workerIndex = index % this.workerCount;
        const worker = this.workers[workerIndex];
        this.activeWorkers.add(workerIndex);

        worker.postMessage({
          lines: batch,
          canvasWidth,
          canvasHeight,
          renderingMode,
          blendingFactor,
          lineWidth,
        });

        worker.onmessage = (event: MessageEvent) => {
          const localMap = new Float32Array(event.data);

          for (let i = 0; i < pixelDensityMap.length; i++) {
            const existingValue = pixelDensityMap[i];
            const newValue = localMap[i];

            if (renderingMode === LINE_RENDERING_MODE.SPLATTING) {
              // Simple addition for splatting
              pixelDensityMap[i] += newValue;
            } else if (renderingMode === LINE_RENDERING_MODE.BLENDING) {
              // Blending using the blending factor
              pixelDensityMap[i] =
                existingValue * (1 - blendingFactor) +
                newValue * blendingFactor;
            }
          }

          remainingBatches--;
          this.activeWorkers.delete(workerIndex);

          if (remainingBatches === 0 && this.activeWorkers.size === 0) {
            this.drawPixelDensityMap(pixelDensityMap);
          }
        };

        worker.onerror = (error: ErrorEvent) => {
          console.error(`Worker ${workerIndex} error:`, error.message);
          this.activeWorkers.delete(workerIndex);
        };
      });
    }
  }

  private getPixelDensityMap(
    lines: Line[],
    canvasWidth: number,
    canvasHeight: number,
    renderingMode: LINE_RENDERING_MODE,
    blendingFactor: number,
    lineWidth: number
  ): Observable<ArrayBuffer> {
    const url = 'http://localhost:3000/calculate-density';

    return this.http
    .post(
      url,
      {
        lines,
        canvasWidth,
        canvasHeight,
        renderingMode,
        blendingFactor,
        lineWidth
      },
      { responseType: 'arraybuffer' }
    );
  }

  private drawLinesRaw(lines: Line[], lineWidth: number): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas before drawing
    this.context.strokeStyle = 'black';
    this.context.lineWidth = lineWidth;

    lines.forEach((line: Line) => {
      this.context.beginPath();
      this.context.moveTo(line.x1, line.y1);
      this.context.lineTo(line.x2, line.y2);
      this.context.stroke();
    });
  }

  private drawLinesBlended(
    lines: Line[],
    lineWidth: number,
    blendingFactor: number
  ): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas before drawing
    this.context.globalAlpha = blendingFactor;
    this.context.strokeStyle = 'black';
    this.context.lineWidth = lineWidth;

    lines.forEach((line: Line) => {
      this.context.beginPath();
      this.context.moveTo(line.x1, line.y1);
      this.context.lineTo(line.x2, line.y2);
      this.context.stroke();
    });

    this.context.globalAlpha = 1.0; //reset
  }

  private drawPixelDensityMap(pixelDensityMap: Float32Array): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.context.createImageData(width, height);

    const maxDensity = this.findMaxDensity(pixelDensityMap);
    // console.log(pixelDensityMap);
    // console.log('maxDensity: ' + maxDensity);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const density = pixelDensityMap[y * width + x];
        const color =
          maxDensity > 0
            ? this.mapDensityToColor(density, maxDensity)
            : { r: 0, g: 0, b: 0 };

        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = 255;
      }
    }

    this.context.putImageData(imageData, 0, 0);
  }

  private mapDensityToColor(
    density: number,
    maxDensity: number
  ): { r: number; g: number; b: number } {
    //const normalized = density / maxDensity;
    const normalized = Math.log10(density + 1.0) / Math.log10(maxDensity + 1.0); // normalized pixel value
    const r = Math.floor((1 - normalized) * 255);
    const g = Math.floor((1 - normalized) * 255);
    const b = Math.floor((1 - normalized) * 255);

    return { r: r, g: g, b: b };
    //const idx = Math.floor(normalized * 255);
    //const color = PLASMA_CROPPED_COLOR_SCHEME[idx];
    //return { r:color.r, g:color.g, b:color.b };
  }

  private findMaxDensity(pixelDensityMap: Float32Array): number {
    let max = 0;
    for (let i = 0; i < pixelDensityMap.length; i++) {
      if (pixelDensityMap[i] > max) {
        max = pixelDensityMap[i];
      }
    }
    return max;
  }

  private createBatches(lines: Line[], batchSize: number): Line[][] {
    const batches: Line[][] = [];
    for (let i = 0; i < lines.length; i += batchSize) {
      batches.push(lines.slice(i, i + batchSize));
    }
    return batches;
  }
}
