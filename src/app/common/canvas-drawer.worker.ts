/// <reference lib="webworker" />

import { Line } from '../sequence/sub-sequence/graph/line.model';
import { LINE_RENDERING_MODE } from '../sequence/sub-sequence/sub-sequence.model';

addEventListener('message', ({ data }) => {
  const {
    lines,
    canvasWidth,
    canvasHeight,
    renderingMode,
    blendingFactor,
    lineWidth,
  } = data;
  const localPixelDensityMap = new Float32Array(canvasWidth * canvasHeight);

  lines.forEach((line: Line) => {
    const x1 = Math.ceil(line.x1);
    const y1 = Math.ceil(line.y1);
    const x2 = Math.ceil(line.x2);
    const y2 = Math.ceil(line.y2);

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const width = Math.floor(maxX - minX) + 1;
    const height = Math.floor(maxY - minY) + 1;

    const dummyCanvas = new OffscreenCanvas(width, height);
    const dummyContext = dummyCanvas.getContext('2d')!;
    dummyContext.clearRect(0, 0, width, height);

    dummyContext.beginPath();
    dummyContext.moveTo(x1 - minX, y1 - minY);
    dummyContext.lineTo(x2 - minX, y2 - minY);
    dummyContext.strokeStyle = 'white';
    dummyContext.lineWidth = lineWidth;
    dummyContext.stroke();

    const imageData = dummyContext.getImageData(0, 0, width, height);
    const dataArr = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const alpha = dataArr[index + 3];
        if (alpha > 0) {
          const canvasX = minX + x;
          const canvasY = minY + y;
          const existingValue =
            localPixelDensityMap[canvasY * canvasWidth + canvasX];
          const newValue = alpha / 255.0;

          if (renderingMode === LINE_RENDERING_MODE.SPLATTING) {
            // Simple addition for splatting
            localPixelDensityMap[canvasY * canvasWidth + canvasX] =
              existingValue + newValue;
          } else if (renderingMode === LINE_RENDERING_MODE.BLENDING) {
            // Blending using the blending factor
            localPixelDensityMap[canvasY * canvasWidth + canvasX] =
              existingValue * (1 - blendingFactor) + newValue * blendingFactor;
          }
        }
      }
    }
  });

  postMessage(localPixelDensityMap);
});
