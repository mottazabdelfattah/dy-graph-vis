function plotDensity(
  pixelDensityMap,
  pixelValMap,
  pixelOpacityMap,
  canvasWidth,
  x,
  y,
  intensity,
  w,
  alpha
) {
  const aAlpha = alpha * intensity;
  if (
    x >= 0 &&
    x < canvasWidth &&
    y >= 0 &&
    y < pixelDensityMap.length / canvasWidth
  ) {
    const index = Math.floor(y) * canvasWidth + Math.floor(x);
    pixelDensityMap[index] += intensity;
    pixelValMap[index] = (w*aAlpha) + pixelValMap[index] * (1.0 - aAlpha);
    pixelOpacityMap[index] = aAlpha + pixelOpacityMap[index] * (1.0 - aAlpha);
  }
}

// Xiaolin Wu's line algorithm implementation
function wuLine(
  pixelDensityMap,
  pixelValMap,
  pixelOpacityMap,
  canvasWidth,
  x1,
  y1,
  x2,
  y2,
  weight,
  alpha
) {
  const steep = Math.abs(y2 - y1) > Math.abs(x2 - x1);
  if (steep) {
    [x1, y1] = [y1, x1];
    [x2, y2] = [y2, x2];
  }
  if (x1 > x2) {
    [x1, x2] = [x2, x1];
    [y1, y2] = [y2, y1];
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const gradient = dx === 0 ? 1 : dy / dx;
  let xEnd = Math.round(x1);
  let yEnd = y1 + gradient * (xEnd - x1);
  let xGap = 1 - (x1 + 0.5 - Math.floor(x1 + 0.5));
  let xPixel1 = xEnd;
  let yPixel1 = Math.floor(yEnd);

  if (steep) {
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      yPixel1,
      xPixel1,
      (1 - (yEnd - yPixel1)) * xGap,
      weight,
      alpha
    );
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      yPixel1 + 1,
      xPixel1,
      (yEnd - yPixel1) * xGap,
      weight,
      alpha
    );
  } else {
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      xPixel1,
      yPixel1,
      (1 - (yEnd - yPixel1)) * xGap,
      weight,
      alpha
    );
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      xPixel1,
      yPixel1 + 1,
      (yEnd - yPixel1) * xGap,
      weight,
      alpha
    );
  }
  let intery = yEnd + gradient;
  xEnd = Math.round(x2);
  yEnd = y2 + gradient * (xEnd - x2);
  xGap = x2 + 0.5 - Math.floor(x2 + 0.5);
  let xPixel2 = xEnd;
  let yPixel2 = Math.floor(yEnd);

  if (steep) {
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      yPixel2,
      xPixel2,
      (1 - (yEnd - yPixel2)) * xGap,
      weight,
      alpha
    );
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      yPixel2 + 1,
      xPixel2,
      (yEnd - yPixel2) * xGap,
      weight,
      alpha
    );
  } else {
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      xPixel2,
      yPixel2,
      (1 - (yEnd - yPixel2)) * xGap,
      weight,
      alpha
    );
    plotDensity(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      xPixel2,
      yPixel2 + 1,
      (yEnd - yPixel2) * xGap,
      weight,
      alpha
    );
  }
  for (let x = xPixel1 + 1; x <= xPixel2 - 1; x++) {
    if (steep) {
      plotDensity(
        pixelDensityMap,
        pixelValMap,
        pixelOpacityMap,
        canvasWidth,
        Math.floor(intery),
        x,
        1 - (intery - Math.floor(intery)),
        weight,
        alpha
      );
      plotDensity(
        pixelDensityMap,
        pixelValMap,
        pixelOpacityMap,
        canvasWidth,
        Math.floor(intery) + 1,
        x,
        intery - Math.floor(intery),
        weight,
        alpha
      );
    } else {
      plotDensity(
        pixelDensityMap,
        pixelValMap,
        pixelOpacityMap,
        canvasWidth,
        x,
        Math.floor(intery),
        1 - (intery - Math.floor(intery)),
        weight,
        alpha
      );
      plotDensity(
        pixelDensityMap,
        pixelValMap,
        pixelOpacityMap,
        canvasWidth,
        x,
        Math.floor(intery) + 1,
        intery - Math.floor(intery),
        weight,
        alpha
      );
    }
    intery += gradient;
  }
}

// Draw parallel lines to achieve the desired line width
function drawThickLine(
  pixelDensityMap,
  pixelValMap,
  pixelOpacityMap,
  canvasWidth,
  x1,
  y1,
  x2,
  y2,
  weight,
  lineWidth,
  alpha
) {
  if (lineWidth <= 1) {
    // Draw a thin line with Wu's line algorithm
    wuLine(
      pixelDensityMap,
      pixelValMap,
      pixelOpacityMap,
      canvasWidth,
      x1,
      y1,
      x2,
      y2,
      weight,
      alpha
    );
  } else {
    // Calculate line vector and its length
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const halfWidth = lineWidth / 2;

    // Calculate perpendicular offsets
    const offsetX = (dy / length) * halfWidth;
    const offsetY = (-dx / length) * halfWidth;

    // Draw lines at parallel offsets to simulate thickness
    for (let i = -halfWidth; i <= halfWidth; i++) {
      // Offset parallel to the line direction
      const xOffset = i * offsetX;
      const yOffset = i * offsetY;
      wuLine(
        pixelDensityMap,
        pixelValMap,
        pixelOpacityMap,
        canvasWidth,
        x1 + xOffset,
        y1 + yOffset,
        x2 + xOffset,
        y2 + yOffset,
        weight,
        alpha
      );
    }
  }
}

export default function handler(req, res) {
    if (req.method === 'POST') {
      const { lines, canvasWidth, canvasHeight, colorEncoding, lineWidth } = req.body;
  
      const pixelDensityMap = new Float32Array(canvasWidth * canvasHeight);
      const pixelValMap = new Float32Array(canvasWidth * canvasHeight);
      const pixelOpacityMap = new Float32Array(canvasWidth * canvasHeight);
  
      lines.forEach((line) => {
        const alpha = line.opacity;
        let val = 1.0;
        if (colorEncoding === "EDGE_WEIGHT") {
          val = line.val;
        } else if (colorEncoding === "LINE_SLOPE") {
          val = line.normalizedSlope;
        }
        drawThickLine(
          pixelDensityMap,
          pixelValMap,
          pixelOpacityMap,
          canvasWidth,
          line.x1,
          line.y1,
          line.x2,
          line.y2,
          val,
          lineWidth,
          alpha
        );
      });
  
      const responseBuffer = Buffer.concat([
        Buffer.from(pixelDensityMap.buffer),
        Buffer.from(pixelValMap.buffer),
        Buffer.from(pixelOpacityMap.buffer),
      ]);
  
      res.setHeader("Content-Type", "application/octet-stream");
      res.status(200).send(responseBuffer);
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }
  
