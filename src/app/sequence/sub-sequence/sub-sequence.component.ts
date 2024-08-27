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
  @Input() blendingFactor: number = 0.5;

  private http = inject(HttpClient);
  private canvasDrawerService!: CanvasDrawerService;
  private subSeqService = inject(SubSequenceService);
  private resizeObserver!: ResizeObserver;

  G_RATIO = 1.0 / 1.618;
  sWidth = 100;
  sHeight = 100;
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
      changes['blendingFactor']
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
      this.lineWidth
    );

    // draw lines
    if (this.canvasDrawerService) {
      this.canvasDrawerService.drawLinesBackEnd(
        lines,
        this.lineWidth,
        this.renderingMode,
        this.blendingFactor
      );

      // labels
      this.labels = [];
      this.subSeq.graphs.forEach((g: Graph, idx) => {
        //if (idx % minDist === 0) {
        this.labels.push({
          text: g.id + '',
          positionX: idx * this.stripeWidth,
          positionY: this.sHeight,
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
    this.sHeight = this.vertexHeight * this.vertexList.length;
    this.bpWidth = this.sHeight * this.G_RATIO;
    if (
      this.visTechnique === VIS_TECHNIQUE.IES ||
      this.visTechnique === VIS_TECHNIQUE.SEP
    ) {
      this.sWidth = this.stripeWidth * this.subSeq.graphs.length + this.bpWidth;
    } else if (
      this.visTechnique === VIS_TECHNIQUE.MSV ||
      this.visTechnique === VIS_TECHNIQUE.TEP
    ) {
      this.sWidth = this.stripeWidth * this.subSeq.graphs.length;
    }
  }
}
