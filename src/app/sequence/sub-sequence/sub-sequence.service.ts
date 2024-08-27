import { Injectable } from '@angular/core';
import { SubSequence, VIS_TECHNIQUE } from './sub-sequence.model';
import { Edge, Graph, Vertex } from './graph/graph.model';
import { Line } from './graph/line.model';

@Injectable({ providedIn: 'root' })
export class SubSequenceService {
  updateGraphLines(
    visTechnique: VIS_TECHNIQUE,
    subSeq: SubSequence,
    vertexList: Vertex[],
    bpWidth: number,
    vertexHeight: number,
    stripeWidth: number,
    lineWidth: number
  ): Line[] {
    // how may buckets wthin each stripe
    const MSVBucketsPerStripe = Math.floor(stripeWidth / lineWidth);
    const lines: Line[] = [];

    subSeq.graphs.forEach((g: Graph, idx) => {
      g.gWidth = stripeWidth;
      g.gHeight = vertexHeight * vertexList.length;
      const seqLength = subSeq.graphs.length;

      // adjusting the line coordinates based on the technique
      switch (visTechnique) {
        case VIS_TECHNIQUE.MSV:
          // Initialize stripesSubspace to zeros
          let MSVStripeBuckets: number[] = new Array(MSVBucketsPerStripe).fill(
            0
          );
          g.edges.forEach((e: Edge) => {
            const line = this.getLine(
              e,
              vertexList,
              idx * stripeWidth,
              bpWidth,
              vertexHeight
            );
            this.getLinesMSV(line, MSVStripeBuckets);
            lines.push(line);
          });

          break;
        case VIS_TECHNIQUE.IES:
          // if (idx === seqLength - 1){
          //   g.gWidth = bpWidth;
          // }
          // in case of IES each line will be broken into seq of segemented lines
          g.edges.forEach((e: Edge) => {
            const l = this.getLine(
              e,
              vertexList,
              idx * stripeWidth,
              bpWidth,
              vertexHeight
            );
            lines.push(l);
            // let k = idx;
            // for (let currentX = l.x1; currentX < l.x2; currentX += stripeWidth,k++) {

            //   const adjLine: Line = { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 };
            //   const newX1 = currentX;
            //   const newX2 = newX1 + stripeWidth;
            //   this.getLinesTEP(adjLine, newX1, newX2, 0, bpWidth);
            //   if(k > seqLength - 1){
            //     const diff = k - seqLength - 1;
            //     adjLine.x1+=diff*stripeWidth;
            //     adjLine.x2+=diff*stripeWidth;
            //     subSeq.graphs[seqLength - 1].lines.push(adjLine);
            //   }else{
            //     subSeq.graphs[k].lines.push(adjLine);
            //   }

            // }
          });

          break;
        case VIS_TECHNIQUE.TEP:
          g.edges.forEach((e: Edge) => {
            const line = this.getLine(
              e,
              vertexList,
              idx * stripeWidth,
              bpWidth,
              vertexHeight
            );
            const newX1 = idx * stripeWidth;
            const newX2 = newX1 + stripeWidth;
            const subSeqSart = 0;
            const subSeqWidth = seqLength * stripeWidth;
            this.getLinesTEP(line, newX1, newX2, subSeqSart, subSeqWidth);
            lines.push(line);
          });
          break;
        case VIS_TECHNIQUE.SEP:
          g.edges.forEach((e: Edge) => {
            const line = this.getLine(
              e,
              vertexList,
              idx * stripeWidth,
              bpWidth,
              vertexHeight
            );
            this.getLinesSEP(line, stripeWidth);
            lines.push(line);
          });

          break;
      }
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

    const slope = (l.y2 - l.y1) / (l.x2 - l.x1);

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
  }

  private getLine(
    e: Edge,
    vertexList: Vertex[],
    xOffset: number,
    gWidth: number,
    scaleY: number
  ) {
    let src = vertexList.find((x) => x.id === e.src);
    let tar = vertexList.find((x) => x.id === e.target);

    const x1 = 0 + xOffset;
    const y1 = src ? src.hcOrder : 0;
    const x2 = gWidth + xOffset;
    const y2 = tar ? tar.hcOrder : 0;
    return {
      x1: x1,
      y1: y1 * scaleY,
      x2: x2,
      y2: y2 * scaleY,
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
