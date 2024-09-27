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
  EDGE_FILTERING,
  EDGE_ORDERING,
  LINE_COLOR_ENCODING,
  LINE_RENDERING_MODE,
  SEP_STRIPE,
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
import { BehaviorSubject } from 'rxjs';
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
  @Input({ required: true }) sepStripeOp!: SEP_STRIPE;
  @Input({ required: true }) edgeFilteringOption!: EDGE_FILTERING;

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

  private selectedVerticesSubject = new BehaviorSubject<Vertex[]>([]);
  selectedVertices$ = this.selectedVerticesSubject.asObservable(); // Expose it as an Observable
  isSelecting: boolean = false; // To track if selection is in progress
  startY: number = 0; // Initial Y position when mouse is pressed
  endY: number = 0; // Final Y position when mouse is released
  selectionStyle: any = {}; // Style binding for the selection rectangle

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['subSeq'] ||
      changes['visTechnique'] ||
      changes['stripeWidth'] ||
      changes['vertexHeight']
    ) {
      this.updateCanvasSize();
      //this.RedrawCanvas();
    } else {
      this.RedrawCanvas();
    }
  }

  ngOnInit(): void {
    // Add click event listener to the document to handle clicks outside the canvas
    document.addEventListener('dblclick', this.handleDocumentClick.bind(this));
  }

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

    // Subscribe to selectedVertices$ and observe changes
    this.selectedVertices$.subscribe((selected) => {
      //console.log('Selected vertices changed:', selected);
      this.RedrawCanvas();
    });
  }

  ngOnDestroy(): void {
    // Clean up the observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    document.removeEventListener('dblclick', this.handleDocumentClick.bind(this));
  }

  private async RedrawCanvas() {
    this.sortVertices();
    this.filterAggregatedEdges();
        const lines: Line[] = this.subSeqService.updateGraphLines(
      this.visTechnique,
      this.subSeq,
      this.vertexList,
      this.bpWidth,
      this.vertexHeight,
      this.stripeWidth,
      this.lineWidth,
      this.blendingFactor,
      this.tepBackgroundOpacity,
      this.sepStripeOp
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

  handleDocumentClick(event: MouseEvent) {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const isClickInsideCanvas =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!isClickInsideCanvas) {
      this.resetSelection();
    }
  }

  resetSelection() {
    this.isSelecting = false;
    this.selectionStyle = {};
    this.selectedVerticesSubject.next([]); // Clear selected vertices
  }

  private handleCanvasResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.RedrawCanvas(); // Only redraw after resize settles
    }, 1); // Delay to ensure resize is finished
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

  private filterAggregatedEdges() {
    this.subSeqService.filterAggEdges(
      this.subSeq,
      this.edgeFilteringOption,
      this.edgeFreqRangeMin,
      this.edgeFreqRangeMax,
      this.selectedVerticesSubject.value
    );
  }

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
    const xOffset = this.sepStripeOp === SEP_STRIPE.START ? 0 : this.bpWidth;
    const graphIndex = Math.floor((mouseX - xOffset) / this.stripeWidth);
    if (graphIndex >= 0 && graphIndex < this.subSeq.graphs.length) {
      this.tooltipTextX = this.subSeq.graphs[graphIndex].name;
      this.tooltipX = mouseX; // X tooltip aligned with mouse X position
      this.tooltipVisibleX = true;
    } else {
      this.tooltipVisibleX = false;
    }

    // Handle selection during mouse movement
    if (this.isSelecting) {
      this.endY = mouseY; // Update the end Y coordinate
      this.updateSelectionRectangle(); // Dynamically update the selection rectangle
    }
  }

  onMouseDown(event: MouseEvent) {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top; // Get mouse Y position relative to the canvas

    this.isSelecting = true;
    this.startY = mouseY;
    this.endY = mouseY; // Initialize endY to the startY for now
  }

  onMouseUp(event: MouseEvent) {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;

    this.isSelecting = false;
    this.endY = mouseY; // Set the final end Y coordinate

    // Get selected vertices based on the selection range
    const selectedVertices = this.getSelectedVertices();

    // Update the BehaviorSubject to notify subscribers
    this.selectedVerticesSubject.next(selectedVertices);

    // Hide the selection rectangle
    this.selectionStyle = {};
  }

  onMouseLeave() {
    this.tooltipVisibleY = false;
    this.tooltipVisibleX = false;
  }

  updateSelectionRectangle() {
    const rectTop = Math.min(this.startY, this.endY); // Top of the selection
    const rectHeight = Math.abs(this.endY - this.startY); // Height of the selection

    // Update the selection rectangle's style dynamically
    this.selectionStyle = {
      top: `${rectTop}px`,
      left: '0px',
      width: '100%', // Full width
      height: `${rectHeight}px`,
    };
  }

  getSelectedVertices(): Vertex[] {
    // Calculate the start and end indices based on the Y coordinates and vertical spacing
    const startIndex = Math.floor(this.startY / this.vertexHeight);
    const endIndex = Math.floor(this.endY / this.vertexHeight);

    // Ensure indices are within bounds
    const minIndex = Math.max(Math.min(startIndex, endIndex), 0);
    const maxIndex = Math.min(
      Math.max(startIndex, endIndex),
      this.vertexList.length - 1
    );

    // Return the list of vertices in the selected range
    return this.vertexList.slice(minIndex, maxIndex + 1);
  }
}
