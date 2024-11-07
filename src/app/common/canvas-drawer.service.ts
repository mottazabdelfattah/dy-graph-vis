import { ElementRef } from '@angular/core';
import { Line } from '../sequence/sub-sequence/graph/line.model';
import {
  GRAY_SCALE_COLOR_SCHEME,
  INFERNO_CROPPED_COLOR_SCHEME,
  MULTI_HUE_COLOR_SCHEME,
  PLASMA_CROPPED_COLOR_SCHEME,
  PLASMA_WHITE_BACKGROUND_COLOR_SCHEME,
} from '../variables';
import {
  COLOR_SCHEME,
  LINE_COLOR_ENCODING,
  LINE_RENDERING_MODE,
} from '../sequence/sub-sequence/sub-sequence.model';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

export class CanvasDrawerService {
  private context!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private http!: HttpClient;
  private apiUrl = environment.apiUrl; // Use the environment variable

  constructor(canvasElement: ElementRef<HTMLCanvasElement>, http: HttpClient) {
    this.http = http;
    this.canvas = canvasElement.nativeElement;
    this.context = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  drawLinesBackEnd(
    lines: Line[],
    lineWidth: number = 1.0,
    renderingMode: LINE_RENDERING_MODE,
    colorEncoding: LINE_COLOR_ENCODING,
    colorSchemeName: COLOR_SCHEME
  ): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    let colorScheme: any[];
    switch (colorSchemeName) {
      case COLOR_SCHEME.MULTI_HUE:
        colorScheme = MULTI_HUE_COLOR_SCHEME;
        break;
      // case COLOR_SCHEME.PLASMA_WHITE_BACKGROUND:
      //   colorScheme = PLASMA_WHITE_BACKGROUND_COLOR_SCHEME;
      //   break;
      case COLOR_SCHEME.PLASMA_CROPPED:
        colorScheme = PLASMA_CROPPED_COLOR_SCHEME;
        break;
      case COLOR_SCHEME.GRAY_SCALE:
        colorScheme = GRAY_SCALE_COLOR_SCHEME;
        break;
      default:
        colorScheme = INFERNO_CROPPED_COLOR_SCHEME;
    }

    if (renderingMode === LINE_RENDERING_MODE.NONE) {
      this.drawLinesRaw(lines, lineWidth, colorEncoding, colorScheme);
    } else if (renderingMode === LINE_RENDERING_MODE.BLENDING) {
      let batchSize = lines.length;
      const batches = this.createBatches(lines, batchSize);
      const arrayLength = canvasWidth * canvasHeight;
      const float32ArraySize = arrayLength * Float32Array.BYTES_PER_ELEMENT;

      let pixelDensityMap = new Float32Array(arrayLength);
      let pixelValMap = new Float32Array(arrayLength);
      let pixelOpacityMap = new Float32Array(arrayLength);
      let pixelHitCountMap = new Int32Array(arrayLength);

      const requests = batches.map((batch) =>
        this.getPixelDensityMap(
          batch,
          canvasWidth,
          canvasHeight,
          renderingMode,
          colorEncoding,
          lineWidth
        )
      );

      forkJoin(requests).subscribe(
        (responses: ArrayBuffer[]) => {
          responses.forEach((response) => {
            console.log('response is back');

            pixelDensityMap = new Float32Array(response, 0, arrayLength);
            pixelValMap = new Float32Array(
              response,
              arrayLength * 4,
              arrayLength
            );
            pixelOpacityMap = new Float32Array(
              response,
              arrayLength * 8,
              arrayLength
            );
            pixelHitCountMap = new Int32Array(
              response,
              arrayLength * 12,
              arrayLength
            );
          });
          const pixelMap =
            colorEncoding === LINE_COLOR_ENCODING.DENSITY
              ? this.scalePixelMap(pixelDensityMap)
              : this.averagePixelMap(pixelValMap, pixelHitCountMap);
          this.drawPixelMap(pixelMap, pixelOpacityMap, colorScheme);
        },
        (error) => {
          console.error('Error:', error);
        }
      );
    }
  }

  private getPixelDensityMap(
    lines: Line[],
    canvasWidth: number,
    canvasHeight: number,
    renderingMode: LINE_RENDERING_MODE,
    colorEncoding: LINE_COLOR_ENCODING,
    lineWidth: number
  ): Observable<ArrayBuffer> {
    const url = this.apiUrl;

    return this.http.post(
      url,
      {
        lines,
        canvasWidth,
        canvasHeight,
        renderingMode,
        colorEncoding,
        lineWidth,
      },
      { responseType: 'arraybuffer' }
    );
  }

  private drawLinesRaw(
    lines: Line[],
    lineWidth: number,
    colorEncoding: LINE_COLOR_ENCODING,
    colorScheme: any[]
  ): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas before drawing
    this.context.lineWidth = lineWidth;
    if (colorEncoding === LINE_COLOR_ENCODING.EDGE_WEIGHT) {
      lines.sort((a, b) => a.val - b.val);
    } else if (colorEncoding === LINE_COLOR_ENCODING.LINE_SLOPE) {
      lines.sort((a, b) => a.normalizedSlope - b.normalizedSlope);
    }

    lines.forEach((line: Line) => {
      let val = 0.5;
      if (colorEncoding ===LINE_COLOR_ENCODING.EDGE_WEIGHT) {
        val = line.val;
      } else if (colorEncoding === LINE_COLOR_ENCODING.LINE_SLOPE) {
        val = line.normalizedSlope;
      }
      const foreColor = this.mapDensityToColor(val, colorScheme);
      this.context.strokeStyle = `rgb(${foreColor.r}, ${foreColor.g}, ${foreColor.b})`; 
      this.context.globalAlpha = line.opacity;
      this.context.beginPath();
      this.context.moveTo(line.x1, line.y1);
      this.context.lineTo(line.x2, line.y2);
      this.context.stroke();
    });

    this.context.globalAlpha = 1.0; // Resetting to default
  }

  private averagePixelMap(
    pixelValMap: Float32Array,
    pixelHitCountMap: Int32Array
  ): Float32Array {
    let finalPixelMap = new Float32Array(pixelValMap.length);
    for (let i = 0; i < pixelValMap.length; i++) {
      finalPixelMap[i] =
        pixelHitCountMap[i] > 0 ? pixelValMap[i] / pixelHitCountMap[i] : 0;
    }
    return finalPixelMap;
  }

  private scalePixelMap(pixelValMap: Float32Array) {
    const maxPixelVal = this.findMaxDensity(pixelValMap);
    let finalPixelMap = new Float32Array(pixelValMap.length);
    for (let i = 0; i < pixelValMap.length; i++) {
      finalPixelMap[i] =
        Math.log10(pixelValMap[i] + 1.0) / Math.log10(maxPixelVal + 1.0);
    }

    return finalPixelMap;
  }

  private drawPixelMap(
    pixelMap: Float32Array,
    pixeOpacityMap: Float32Array,
    colorScheme: any[]
  ): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.context.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const pixelVal = pixelMap[y * width + x];
        const localAlpha = pixeOpacityMap[y * width + x];

        const foreColor = this.mapDensityToColor(pixelVal, colorScheme);
        if (foreColor) {
          const color = this.blendWithBackground(foreColor, localAlpha);

          if (color) {
            imageData.data[index] = color.r;
            imageData.data[index + 1] = color.g;
            imageData.data[index + 2] = color.b;
            imageData.data[index + 3] = 255;
          }
        }
      }
    }

    this.context.putImageData(imageData, 0, 0);
  }

  private mapDensityToColor(
    intensity: number,
    colorScheme: any[]
  ): { r: number; g: number; b: number } {
    const idx = Math.floor(intensity * (colorScheme.length - 1));
    const color = colorScheme[idx];

    return color;
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

  private blendWithBackground(
    rgb: { r: number; g: number; b: number },
    opacity: number
  ): { r: number; g: number; b: number } {
    const background = { r: 255, g: 255, b: 255 }; // White background

    // Blend the original color with the white background based on the opacity level
    const newR = Math.round(rgb.r * opacity + background.r * (1 - opacity));
    const newG = Math.round(rgb.g * opacity + background.g * (1 - opacity));
    const newB = Math.round(rgb.b * opacity + background.b * (1 - opacity));

    return { r: newR, g: newG, b: newB };
  }
}
