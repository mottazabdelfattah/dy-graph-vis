import { Injectable } from '@angular/core';
import {
  LINE_COLOR_ENCODING,
  SubSequence,
  VIS_TECHNIQUE,
} from './sub-sequence.model';
import { Edge, Graph, Vertex } from './graph/graph.model';
import { Line } from './graph/line.model';
import { UtilService } from '../../common/util.service';

@Injectable({ providedIn: 'root' })
export class SubSequenceService {
  constructor(private utilService: UtilService) {}

  updateGraphLines(
    visTechnique: VIS_TECHNIQUE,
    subSeq: SubSequence,
    vertexList: Vertex[],
    bpWidth: number,
    vertexHeight: number,
    stripeWidth: number,
    lineWidth: number,
    colorEncodingOp: LINE_COLOR_ENCODING
  ): Line[] {
    // how may buckets wthin each stripe
    const MSVBucketsPerStripe = Math.floor(stripeWidth / lineWidth);
    const lines: Line[] = [];
    const seqLength = subSeq.graphs.length;
    const maxSlope =
      visTechnique === VIS_TECHNIQUE.MSV
        ? subSeq.height
        : subSeq.height / bpWidth;
    const maxEdgeWeight = subSeq.maxEdgeWeight;

    subSeq.graphs.forEach((g: Graph, idx) => {
      g.gWidth = stripeWidth;
      g.gHeight = vertexHeight * vertexList.length;

      

      // Initialize stripesSubspace to zeros
      let MSVStripeBuckets: number[] = new Array(MSVBucketsPerStripe).fill(0);
      g.edges.forEach((e: Edge) => {
        const line = this.getLine(
          e,
          vertexList,
          idx * stripeWidth,
          bpWidth,
          vertexHeight
        );

        switch (visTechnique) {
          case VIS_TECHNIQUE.MSV:
            this.getLinesMSV(line, MSVStripeBuckets);
            break;
          case VIS_TECHNIQUE.IES:
            break;
          case VIS_TECHNIQUE.TEP:
            const newX1 = idx * stripeWidth;
            const newX2 = newX1 + stripeWidth;
            const subSeqSart = 0;
            const subSeqWidth = seqLength * stripeWidth;
            this.getLinesTEP(line, newX1, newX2, subSeqSart, subSeqWidth);
            break;
          case VIS_TECHNIQUE.SEP:
            this.getLinesSEP(line, stripeWidth);
            break;
        }

        // normalize line weight
        line.val = Math.log10(line.val + 1.0) / Math.log10(maxEdgeWeight + 1.0);

        // normalize slope        
        line.normalizedSlope = this.utilService.mapRange(
          line.normalizedSlope,
          -maxSlope,
          maxSlope,
          0.0,
          1.0
        );

        //push the line
        lines.push(line);
      });
    });

    return lines;
  }

  private getLinesSEP(l: Line, stripeWidth: number) {
    //cuttoff the lines

    // Calculate the slope (m) of the line
    const slope = (l.y2 - l.y1) / (l.x2 - l.x1);
    // Calculate the new x2
    l.x2 = l.x1 + stripeWidth;
    // Calculate the new y2 using the line equation
    l.y2 = slope * (l.x2 - l.x1) + l.y1;
  }

  private getLinesTEP(
    l: Line,
    newX1: number,
    newX2: number,
    subSeqSart: number,
    subSeqWidth: number
  ) {
    // update lines so that they extende thru the whole subseq
    l.x1 = subSeqSart;
    l.x2 = subSeqWidth;

    // update the slope
    const slope = (l.y2 - l.y1) / (l.x2 - l.x1);
    l.normalizedSlope = slope;

    // Calculate the new y1 and y2 based on the slope
    const newY1 = l.y1 + slope * (newX1 - l.x1);
    const newY2 = l.y1 + slope * (newX2 - l.x1);

    //update the line coordinates
    l.x1 = newX1;
    l.y1 = newY1;
    l.x2 = newX2;
    l.y2 = newY2;
  }

  private getLinesMSV(l: Line, stripeBuckets: number[]) {
    let stripeBucketIdx = this.getColIndexWithLowestValue(stripeBuckets);
    l.x1 = l.x2 = l.x1 + stripeBucketIdx;
    stripeBuckets[stripeBucketIdx]++;
    // in case of MSV the slope is encoded as direction
    const length = l.y2 - l.y1;
    l.normalizedSlope = length;
  }

  private getLine(
    e: Edge,
    vertexList: Vertex[],
    xOffset: number,
    gWidth: number,
    scaleY: number
  ): Line {
    let src = vertexList.find((x) => x.id === e.src);
    let tar = vertexList.find((x) => x.id === e.target);

    const x1 = 0 + xOffset;
    const y1 = src ? src.hcOrder* scaleY : 0;
    const x2 = gWidth + xOffset;
    const y2 = tar ? tar.hcOrder* scaleY : 0;
    const slope = (y2 - y1) / (x2 - x1);

    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      val: e.weight,
      normalizedSlope: slope,
    };
  }

  private getColIndexWithLowestValue(stripeSubspace: number[]): number {
    if (stripeSubspace.length === 0) {
      throw new Error('Invalid row index or empty array');
    }

    let minColIndex = 0;
    let minValue = stripeSubspace[0];

    for (let j = 1; j < stripeSubspace.length; j++) {
      if (stripeSubspace[j] < minValue) {
        minValue = stripeSubspace[j];
        minColIndex = j;
      }
    }

    return minColIndex;
  }
}
