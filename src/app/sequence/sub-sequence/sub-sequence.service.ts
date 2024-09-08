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
    foregroundAlpha: number,
    backgroundAlpha: number
  ): Line[] {
    let lines: Line[] = [];

    const maxEdgeWeight = subSeq.maxEdgeWeight;
    const maxSlope = this.getMaxSlope(visTechnique, subSeq, bpWidth);

    switch (visTechnique) {
      case VIS_TECHNIQUE.MSV:
        lines = this.getMSVLines(
          subSeq,
          vertexList,
          bpWidth,
          vertexHeight,
          stripeWidth,
          lineWidth,
          foregroundAlpha
        );
        break;
      case VIS_TECHNIQUE.IES:
        lines = this.getIESLines(
          subSeq,
          vertexList,
          bpWidth,
          vertexHeight,
          stripeWidth,
          foregroundAlpha
        );
        break;
      case VIS_TECHNIQUE.SEP:
        lines = this.getSEPLines(
          subSeq,
          vertexList,
          bpWidth,
          vertexHeight,
          stripeWidth,
          foregroundAlpha
        );
        break;
      case VIS_TECHNIQUE.TEP:
        lines = this.getTEPLines(
          subSeq,
          vertexList,
          bpWidth,
          vertexHeight,
          stripeWidth,
          foregroundAlpha,
          backgroundAlpha
        );
        break;
    }

    // normalize lines weight and slope
    lines.forEach((line: Line) => {
      // weight
      line.val = Math.log10(line.val + 1.0) / Math.log10(maxEdgeWeight + 1.0);

      // normalize slope
      line.normalizedSlope = this.utilService.mapRange(
        -line.normalizedSlope,
        -maxSlope,
        maxSlope,
        0.0,
        1.0
      );
    });

    return lines;
  }

  private getTEPLines(
    subSeq: SubSequence,
    vertexList: Vertex[],
    bpWidth: number,
    vertexHeight: number,
    stripeWidth: number,
    foregroundAlpha: number,
    backgroundAlpha: number
  ): Line[] {
    const lines: Line[] = [];
    const subseqLength = subSeq.graphs.length;
    subSeq.graphs.forEach((g: Graph, idx) => {
      const newX1 = idx * stripeWidth;
      const newX2 = newX1 + stripeWidth;
      const subSeqSart = 0;
      const subSeqWidth = subseqLength * stripeWidth;

      // background lines
      subSeq.aggEdgesFiltered.forEach((tuple) => {
        const line = this.getLine(
          tuple.edge,
          vertexList,
          subSeq.graphs.length * stripeWidth,
          bpWidth,
          vertexHeight,
          backgroundAlpha
        );
        this.cutOffLinesTEP(line, newX1, newX2, subSeqSart, subSeqWidth);
        lines.push(line);
      });

      // forground lines
      const filteredEdges = this.filterEdges(g.edges, subSeq.aggEdgesFiltered);
      filteredEdges.forEach((e: Edge) => {
        const line = this.getLine(
          e,
          vertexList,
          idx * stripeWidth,
          bpWidth,
          vertexHeight,
          foregroundAlpha
        );
        this.cutOffLinesTEP(line, newX1, newX2, subSeqSart, subSeqWidth);
        lines.push(line);
      });
    });

    return lines;
  }

  private getMSVLines(
    subSeq: SubSequence,
    vertexList: Vertex[],
    bpWidth: number,
    vertexHeight: number,
    stripeWidth: number,
    lineWidth: number,
    foregroundAlpha: number
  ): Line[] {
    const MSVBucketsPerStripe = Math.ceil(stripeWidth / lineWidth);
    const lines: Line[] = [];
    subSeq.graphs.forEach((g: Graph, idx) => {
      // Initialize stripesSubspace to zeros
      let MSVStripeBuckets: number[] = new Array(MSVBucketsPerStripe).fill(0);
      const filteredEdges = this.filterEdges(g.edges, subSeq.aggEdgesFiltered);
      filteredEdges.forEach((e: Edge) => {
        const line = this.getLine(
          e,
          vertexList,
          idx * stripeWidth,
          bpWidth,
          vertexHeight,
          foregroundAlpha
        );

        let stripeBucketIdx = this.getColIndexWithLowestValue(MSVStripeBuckets);
        line.x1 = line.x2 = line.x1 + (stripeBucketIdx*lineWidth);
        MSVStripeBuckets[stripeBucketIdx]++;

        // in case of MSV the slope is encoded as direction
        const length = line.y2 - line.y1;
        line.normalizedSlope = length;

        lines.push(line);
      });
    });

    return lines;
  }

  private getSEPLines(
    subSeq: SubSequence,
    vertexList: Vertex[],
    bpWidth: number,
    vertexHeight: number,
    stripeWidth: number,
    foregroundAlpha: number
  ): Line[] {
    const lines: Line[] = [];
    const subseqLength = subSeq.graphs.length;

    // draw the rep. graph of only one graph exists in the seq
    if (subseqLength > 1) {
      subSeq.graphs.forEach((g: Graph, idx) => {
        const filteredEdges = this.filterEdges(
          g.edges,
          subSeq.aggEdgesFiltered
        );
        filteredEdges.forEach((e: Edge) => {
          const line = this.getLine(
            e,
            vertexList,
            idx * stripeWidth,
            bpWidth,
            vertexHeight,
            foregroundAlpha
          );
          this.cutOffLinesSEP(line, stripeWidth);
          lines.push(line);
        });
      });
    }

    // representative graph
    subSeq.aggEdgesFiltered.forEach((tuple) => {
      const line = this.getLine(
        tuple.edge,
        vertexList,
        subseqLength > 1 ? subseqLength * stripeWidth : 0,
        bpWidth,
        vertexHeight,
        foregroundAlpha
      );
      lines.push(line);
    });

    return lines;
  }

  private getIESLines(
    subSeq: SubSequence,
    vertexList: Vertex[],
    bpWidth: number,
    vertexHeight: number,
    stripeWidth: number,
    foregroundAlpha: number
  ): Line[] {
    const lines: Line[] = [];
    
    subSeq.graphs.forEach((g: Graph, idx) => {
      const filteredEdges = this.filterEdges(g.edges, subSeq.aggEdgesFiltered);
      filteredEdges.forEach((e: Edge) => {
        const line = this.getLine(
          e,
          vertexList,
          idx * stripeWidth,
          bpWidth,
          vertexHeight,
          foregroundAlpha
        );
        lines.push(line);
      });
    });

    return lines;
  }

  private cutOffLinesSEP(l: Line, stripeWidth: number) {
    //cuttoff the lines

    // Calculate the slope (m) of the line
    const slope = (l.y2 - l.y1) / (l.x2 - l.x1);
    // Calculate the new x2
    l.x2 = l.x1 + stripeWidth;
    // Calculate the new y2 using the line equation
    l.y2 = slope * (l.x2 - l.x1) + l.y1;
  }

  private cutOffLinesTEP(
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

  private getLine(
    e: Edge,
    vertexList: Vertex[],
    xOffset: number,
    gWidth: number,
    scaleY: number,
    blendingFactor: number
  ): Line {
    let srcIdx = vertexList.findIndex((x) => x.id === e.src);
    let tarIdx = vertexList.findIndex((x) => x.id === e.target);

    const x1 = 0 + xOffset;
    const y1 = srcIdx !== -1 ? srcIdx * scaleY : 0;
    const x2 = gWidth + xOffset;
    const y2 = tarIdx !== -1 ? tarIdx * scaleY : 0;
    const slope = (y2 - y1) / (x2 - x1);

    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      val: e.weight,
      normalizedSlope: slope,
      opacity: blendingFactor,
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

  private getMaxSlope(
    visTechnique: VIS_TECHNIQUE,
    subSeq: SubSequence,
    bpWidth: number
  ): number {
    let maxSlope = subSeq.height / bpWidth;
    if (visTechnique === VIS_TECHNIQUE.MSV) maxSlope = subSeq.height;
    else if (visTechnique === VIS_TECHNIQUE.TEP)
      maxSlope = subSeq.height / subSeq.width;

    return maxSlope;
  }

  private filterEdges(edges: Edge[], aggEdges: { edge: Edge; frq: number }[]) {
    return edges.filter((edge) =>
      aggEdges.some(
        (tuple) =>
          tuple.edge.src === edge.src && tuple.edge.target === edge.target
      )
    );
  }
}
