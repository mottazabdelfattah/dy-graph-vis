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
  LINE_COLOR_ENCODING,
  LINE_RENDERING_MODE,
  SubSequence,
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

  private http = inject(HttpClient);
  private canvasDrawerService!: CanvasDrawerService;
  private subSeqService = inject(SubSequenceService);
  private resizeObserver!: ResizeObserver;

  G_RATIO = 1.0 / 1.618;
  bpWidth = 100;
  labels: { text: string; positionX: number; positionY: number }[] = [];

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
    }

    else if (
      changes['lineWidth'] ||
      changes['renderingMode'] ||
      changes['blendingFactor'] ||
      changes['colorScheme'] ||
      changes['colorEncoding']
    ) {
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
    const lines: Line[] = this.subSeqService.updateGraphLines(
      this.visTechnique,
      this.subSeq,
      this.vertexList,
      this.bpWidth,
      this.vertexHeight,
      this.stripeWidth,
      this.lineWidth, 
      this.colorEncoding
    );

    // sorting lines based on their length in ascending order
    lines.sort((a, b) => {
      const lengthA = Math.sqrt((a.x2 - a.x1) ** 2 + (a.y2 - a.y1) ** 2);
      const lengthB = Math.sqrt((b.x2 - b.x1) ** 2 + (b.y2 - b.y1) ** 2);
      return lengthB-lengthA;
    });

    // draw lines
    if (this.canvasDrawerService) {
      this.canvasDrawerService.drawLinesBackEnd(
        lines,
        this.lineWidth,
        this.renderingMode,
        this.colorEncoding,
        this.blendingFactor,
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
    this.RedrawCanvas(); // Call your method to update the canvas
  }

  private updateCanvasSize() {
    this.subSeq.height = this.vertexHeight * this.vertexList.length;
    this.bpWidth = this.subSeq.height * this.G_RATIO;
    if (
      this.visTechnique === VIS_TECHNIQUE.IES ||
      this.visTechnique === VIS_TECHNIQUE.SEP
    ) {
      this.subSeq.width = this.stripeWidth * this.subSeq.graphs.length + this.bpWidth;
    } else if (
      this.visTechnique === VIS_TECHNIQUE.MSV ||
      this.visTechnique === VIS_TECHNIQUE.TEP
    ) {
      this.subSeq.width = this.stripeWidth * this.subSeq.graphs.length;
    }
  }
}
