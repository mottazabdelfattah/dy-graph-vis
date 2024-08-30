import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UtilService {
  public findMax(arr: Float32Array): number {
    let max = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) {
        max = arr[i];
      }
    }
    return max;
  }

  public findMin(arr: Float32Array): number {
    if (arr.length === 0) {
      throw new Error('Array is empty');
    }

    let minValue = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < minValue) {
        minValue = arr[i];
      }
    }
    return minValue;
  }

  /**
   * Maps a number from one range to another.
   *
   * @param x - The input number to map.
   * @param min - The minimum value of the input range.
   * @param max - The maximum value of the input range.
   * @param a - The minimum value of the target range.
   * @param b - The maximum value of the target range.
   * @returns The mapped number in the range [a, b].
   */
  public mapRange(
    x: number,
    min: number,
    max: number,
    a: number,
    b: number
  ): number {
    return a + ((x - min) * (b - a)) / (max - min);
  }
}
