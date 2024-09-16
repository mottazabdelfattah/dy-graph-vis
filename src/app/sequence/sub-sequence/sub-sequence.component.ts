import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {
  COLOR_SCHEME,
  EDGE_ORDERING,
  LINE_COLOR_ENCODING,
  LINE_RENDERING_MODE,
  SubSequence,
  VERTEXT_ORDERING,
  VIS_TECHNIQUE,
} from './sub-sequence.model';
import { GraphComponent } from './graph/graph.component';
import { Graph, Vertex } from './graph/graph.model';
import { SubSequenceService } from './sub-sequence.service';
import { Line } from './graph/line.model';
import { CanvasDrawerService } from '../../common/canvas-drawer.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-sub-sequence',
  standalone: true,
  imports: [GraphComponent, CommonModule],
  templateUrl: './sub-sequence.component.html',
  styleUrl: './sub-sequence.component.css',
})
export class SubSequenceComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('canvasElement') canvas!: ElementRef<HTMLCanvasElement>;
  @Input({ required: true }) subSeq!: SubSequence;
  @Input({ required: true }) vertexList!: Vertex[];
  @Input({ required: true }) stripeWidth!: number;
  @Input({ required: true }) vertexHeight!: number;
  @Input({ required: true }) lineWidth!: number;
  @Input({ required: true }) visTechnique!: VIS_TECHNIQUE;
  @Input({ required: true }) renderingMode!: LINE_RENDERING_MODE;
  @Input({ required: true }) colorScheme!: COLOR_SCHEME;
  @Input({ required: true }) blendingFactor!: number;
  @Input({ required: true }) colorEncoding!: LINE_COLOR_ENCODING;
  @Input({ required: true }) vertexOrdering!: VERTEXT_ORDERING;
  @Input({ required: true }) edgeOrdering!: EDGE_ORDERING;
  @Input({ required: true }) tepBackgroundOpacity!: number;
  @Input({ required: true }) edgeFreqRangeMin!: number;
  @Input({ required: true }) edgeFreqRangeMax!: number;

  private http = inject(HttpClient);
  private canvasDrawerService!: CanvasDrawerService;
  private subSeqService = inject(SubSequenceService);
  private resizeObserver!: ResizeObserver;
  private resizeTimeout!: any;

  G_RATIO = 1.0 / 1.618;
  bpWidth = 100;
  labels: { text: string; positionX: number; positionY: number }[] = [];

  tooltipTextY: string = ''; // Tooltip text for Y-axis
  tooltipVisibleY: boolean = false; // Tooltip visibility for Y-axis

  tooltipTextX: string = ''; // Tooltip text for X-axis
  tooltipVisibleX: boolean = false; // Tooltip visibility for X-axis

  tooltipX: number = 0; // X position of tooltip
  tooltipY: number = 0; // Y position of tooltip

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['subSeq'] ||
      changes['visTechnique'] ||
      changes['stripeWidth'] ||
      changes['vertexHeight']
    ) {
      this.updateCanvasSize();
      this.RedrawCanvas();
    } else {
      this.RedrawCanvas();
    }
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.canvasDrawerService = new CanvasDrawerService(this.canvas, this.http);
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === this.canvas.nativeElement) {
          this.handleCanvasResize();
        }
      }
    });

    // Observe the canvas element
    if (this.canvas) {
      this.resizeObserver.observe(this.canvas.nativeElement);
    }
  }

  private RedrawCanvas() {
    this.sortVertices();
    const lines: Line[] = this.subSeqService.updateGraphLines(
      this.visTechnique,
      this.subSeq,
      this.vertexList,
      this.bpWidth,
      this.vertexHeight,
      this.stripeWidth,
      this.lineWidth,
      this.blendingFactor,
      this.tepBackgroundOpacity
    );

    // draw lines
    if (this.canvasDrawerService) {
      this.canvasDrawerService.drawLinesBackEnd(
        lines,
        this.lineWidth,
        this.renderingMode,
        this.colorEncoding,
        this.colorScheme
      );

      // labels
      this.labels = [];
      this.subSeq.graphs.forEach((g: Graph, idx) => {
        //if (idx % minDist === 0) {
        this.labels.push({
          text: g.id + '',
          positionX: idx * this.stripeWidth,
          positionY: this.subSeq.height,
        });
        //}
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up the observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private handleCanvasResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.RedrawCanvas(); // Only redraw after resize settles
    }, 200); // Delay to ensure resize is finished
  }

  private updateCanvasSize() {
    this.subSeq.height = this.vertexHeight * this.vertexList.length;
    this.bpWidth = Math.min(300, this.subSeq.height * this.G_RATIO);
    if (this.visTechnique === VIS_TECHNIQUE.SEP) {
      const seqLength =
        this.subSeq.graphs.length > 1 ? this.subSeq.graphs.length : 0;
      this.subSeq.width = this.stripeWidth * seqLength + this.bpWidth;
    } else if (this.visTechnique === VIS_TECHNIQUE.IES) {
      this.subSeq.width =
        this.stripeWidth * (this.subSeq.graphs.length - 1) + this.bpWidth;
    } else if (this.visTechnique === VIS_TECHNIQUE.TEP) {
      this.subSeq.width = Math.max(
        this.bpWidth,
        this.stripeWidth * this.subSeq.graphs.length
      );
    } else if (this.visTechnique === VIS_TECHNIQUE.MSV) {
      this.subSeq.width = this.stripeWidth * this.subSeq.graphs.length;
    }
  }

  private sortVertices() {
    if (this.vertexOrdering === VERTEXT_ORDERING.HC) {
      this.vertexList.sort((a, b) => {
        return a.hcOrder - b.hcOrder;
      });
    } else {
      this.vertexList.sort((a, b) => {
        return a.rndOrder - b.rndOrder;
      });
    }
  }

  // private sortEdges() {
  //   if (this.edgeOrdering === EDGE_ORDERING.FREQUENCY) {
  //     this.subSeq.aggEdgesFiltered.sort((a, b) => a.frq - b.frq);
  //   } else if (this.edgeOrdering === EDGE_ORDERING.WEIGHT) {
  //     this.subSeq.aggEdgesFiltered.sort((a, b) => b.edge.weight - a.edge.weight);
  //   }

  //   this.subSeq.graphs.forEach((g) => {
  //     g.edges.sort((a, b) => {
  //       const indexA = this.subSeq.aggEdgesFiltered.findIndex(
  //         (tuple) => tuple.edge.src === a.src && tuple.edge.target === a.target
  //       );
  //       const indexB = this.subSeq.aggEdgesFiltered.findIndex(
  //         (tuple) => tuple.edge.src === b.src && tuple.edge.target === b.target
  //       );
  //       return indexA - indexB;
  //     });
  //   });
  // }

  exportCanvas(): void {
    const canvasElement = this.canvas.nativeElement;
    const dataURL = canvasElement.toDataURL('image/png');

    // Create a link element to trigger download
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'canvas-image.png';
    link.click();
  }

  onMouseMove(event: MouseEvent) {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Get mouse position relative to the canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Translate mouseY to corresponding vertex based on verticalSpacing (Y-axis tooltip)
    const vertexIndex = Math.floor(mouseY / this.vertexHeight);
    if (vertexIndex >= 0 && vertexIndex < this.vertexList.length) {
      this.tooltipTextY = this.vertexList[vertexIndex].name;
      this.tooltipX = mouseX + 10; // Position tooltip slightly to the right of the cursor
      this.tooltipY = mouseY + 10; // Position tooltip slightly below the cursor
      this.tooltipVisibleY = true;
    } else {
      this.tooltipVisibleY = false;
    }

    // Translate mouseX to corresponding graph name based on horizontalSpacing (X-axis tooltip)
    const graphIndex = Math.floor(mouseX / this.stripeWidth);
    if (graphIndex >= 0 && graphIndex < this.subSeq.graphs.length) {
      this.tooltipTextX = this.subSeq.graphs[graphIndex].name;
      this.tooltipX = mouseX; // X tooltip aligned with mouse X position
      this.tooltipVisibleX = true;
    } else {
      this.tooltipVisibleX = false;
    }
  }

  onMouseLeave() {
    // Hide tooltips when mouse leaves the canvas
    this.tooltipVisibleY = false;
    this.tooltipVisibleX = false;
  }
}
