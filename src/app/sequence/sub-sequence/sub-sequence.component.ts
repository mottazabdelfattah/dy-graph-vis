import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {
  CANVAS_SELECTION_MODE,
  COLOR_SCHEME,
  EDGE_FILTERING,
  EDGE_ORDERING,
  LINE_COLOR_ENCODING,
  LINE_ORDERING,
  LINE_RENDERING_MODE,
  SEP_STRIPE,
  SubSequence,
  VERTEXT_ORDERING,
  VIS_TECHNIQUE,
} from './sub-sequence.model';
import { Edge, Graph, Vertex } from './graph/graph.model';
import { SubSequenceService } from './sub-sequence.service';
import { Line } from './graph/line.model';
import { CanvasDrawerService } from '../../common/canvas-drawer.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
@Component({
  selector: 'app-sub-sequence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sub-sequence.component.html',
  styleUrl: './sub-sequence.component.css',
})
export class SubSequenceComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('canvasElement') canvas!: ElementRef<HTMLCanvasElement>;
  @Output() splitAction = new EventEmitter<number>();
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
  @Input({ required: true }) canvasSelectionMode!: CANVAS_SELECTION_MODE;
  @Input({ required: true }) isManPartitioning!: boolean;
  @Input({ required: true }) lineOrdering!: LINE_ORDERING;
  @Input({ required: true }) isLineOrderingAscending!: boolean;

  CANVAS_SELECTION_MODE = CANVAS_SELECTION_MODE;
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
  selectedTimepoints: Graph[] = [];
  isSelecting: boolean = false; // To track if selection is in progress
  selections: { startX: number; endX: number; startY: number; endY: number }[] =
    [];
  startY: number = 0; // Initial Y position when mouse is pressed
  endY: number = 0; // Final Y position when mouse is released
  startX: number = 0; // Initial X position when mouse is pressed
  endX: number = 0; // Final X position when mouse is released

  selectionStyle: any = {}; // Style binding for the selection rectangle
  isCtrlPressed: boolean = false; // Track the Ctrl key state

  showSplitButton = false;
  splitButtonPosition = { x: 0, y: 0 };
  splitButtonDimensions = { width: 12, height: 12 }; // Set your button dimensions
  subSplitIndex = -1;

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
      // console.log(`subseq aggDensity:${this.subSeq.aggEdges.length/this.vertexList.length}`);
    } else {
      this.RedrawCanvas();
    }
  }

  ngOnInit(): void {
    // Add click event listener to the document to handle clicks outside the canvas
    document.addEventListener('dblclick', this.handleDocumentClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
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
    document.removeEventListener(
      'dblclick',
      this.handleDocumentClick.bind(this)
    );
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey) {
      this.isCtrlPressed = true; // Mark Ctrl as pressed
    }
  }

  handleKeyUp(event: KeyboardEvent) {
    if (event.key === 'Control') {
      this.isCtrlPressed = false; // Mark Ctrl as released
      this.performSelection();
      this.selectionStyle = {};
    }
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
        this.colorScheme,
        this.lineOrdering,
        this.isLineOrderingAscending
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
    this.selections = [];
    this.selectionStyle = {};
    this.selectedVerticesSubject.next([]); // Clear selected vertices
    this.selectedTimepoints = [];
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

      // handle the position of split button
      if (this.isManPartitioning) {
        this.subSplitIndex = graphIndex;
        this.splitButtonPosition.x =
          event.clientX - rect.left - this.splitButtonDimensions.width / 2;
        this.splitButtonPosition.y =
          event.clientY - rect.top - this.splitButtonDimensions.height / 2;
        this.showSplitButton = true;
      }
    } else {
      this.tooltipVisibleX = false;
      this.showSplitButton = false;
    }

    // Handle selection during mouse movement
    if (this.isSelecting) {
      this.selections[this.selections.length - 1].endX = mouseX;
      this.selections[this.selections.length - 1].endY = mouseY;
      this.updateSelectionRectangle(); // Dynamically update the selection rectangle
    }
  }

  onMouseDown(event: MouseEvent) {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top; // Get mouse Y position relative to the canvas
    const mouseX = event.clientX - rect.left; // Get mouse X position relative to the canvas

    this.isSelecting = true;
    this.startY = mouseY;
    this.endY = mouseY; // Initialize endY to the startY for now
    this.startX = mouseX;
    this.endX = mouseX; // Initialize endX to the startX for now

    // reset selections if Ctrl is not pressed
    if (!event.ctrlKey) {
      this.selections = []; // Clear previous selections
    }

    // Initialize a new selection rectangle
    this.selections.push({
      startX: this.startX,
      startY: this.startY,
      endX: this.startX,
      endY: this.startY,
    });
  }

  onMouseUp(event: MouseEvent) {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const mouseX = event.clientX - rect.left;

    this.isSelecting = false;
    this.endY = mouseY; // Set the final end Y coordinate
    this.endX = mouseX; // Set the final end Y coordinate

    // Finalize the end position of the last selection
    this.selections[this.selections.length - 1].endX = mouseX;
    this.selections[this.selections.length - 1].endY = mouseY;

    if (!this.isCtrlPressed) {
      this.performSelection();
    }

    // Hide the selection rectangle
    this.selectionStyle = {};
  }

  onMouseLeave() {
    this.tooltipVisibleY = false;
    this.tooltipVisibleX = false;
    this.showSplitButton = false;
  }

  performSelection() {
    if (this.canvasSelectionMode === CANVAS_SELECTION_MODE.VERTICES) {
      // Get selected vertices based on the selection range
      const selectedVertices = this.getSelectedVertices();
      // Update the BehaviorSubject to notify subscribers
      this.selectedVerticesSubject.next(selectedVertices);
    } else if (this.canvasSelectionMode === CANVAS_SELECTION_MODE.TIMEPOINTS) {
      const selectedTimepoints = this.getSelectedTimepoints();
      this.selectedTimepoints = selectedTimepoints;
    }
  }

  updateSelectionRectangle() {
    // Update the selection rectangle's style dynamically
    if (this.canvasSelectionMode === CANVAS_SELECTION_MODE.VERTICES) {
      this.selectionStyle = this.selections.map((selection) => ({
        top: `${Math.min(selection.startY, selection.endY)}px`,
        left: '0px',
        width: '100%',
        height: `${Math.abs(selection.endY - selection.startY)}px`,
      }));
    } else if (this.canvasSelectionMode === CANVAS_SELECTION_MODE.TIMEPOINTS) {
      this.selectionStyle = this.selections.map((selection) => ({
        top: '0px',
        left: `${Math.min(selection.startX, selection.endX)}px`,
        width: `${Math.abs(selection.endX - selection.startX)}px`,
        height: '100%',
      }));
    }
  }

  getSelectedVertices(): Vertex[] {
    let selectedVertices: Vertex[] = [];
    for (const selection of this.selections) {
      // Calculate the start and end indices based on the Y coordinates and vertical spacing
      const startIndex = Math.floor(selection.startY / this.vertexHeight);
      const endIndex = Math.floor(selection.endY / this.vertexHeight);

      // Ensure indices are within bounds
      const minIndex = Math.max(Math.min(startIndex, endIndex), 0);
      const maxIndex = Math.min(
        Math.max(startIndex, endIndex),
        this.vertexList.length - 1
      );
      selectedVertices = selectedVertices.concat(
        this.vertexList.slice(minIndex, maxIndex + 1)
      );
    }

    return selectedVertices;
  }

  getSelectedTimepoints(): Graph[] {
    let selectedGraphs: Graph[] = [];

    for (const selection of this.selections) {
      // Calculate the start and end indices based on the Y coordinates and vertical spacing
      const startIndex = Math.floor(selection.startX / this.stripeWidth);
      const endIndex = Math.floor(selection.endX / this.stripeWidth);

      // Ensure indices are within bounds
      const minIndex = Math.max(Math.min(startIndex, endIndex), 0);
      const maxIndex = Math.min(
        Math.max(startIndex, endIndex),
        this.subSeq.graphs.length - 1
      );
      selectedGraphs = selectedGraphs.concat(
        this.subSeq.graphs.slice(minIndex, maxIndex + 1)
      );
    }

    return selectedGraphs;
  }

  // Method to get the vertex name by its ID
  getVertexName(vertexId: number): string | undefined {
    const vertex = this.vertexList.find(v => v.id === vertexId);
    return vertex ? vertex.name : undefined; // Return the name or undefined if not found
  }

  onSplitButtonClick() {
    this.splitAction.emit(this.subSplitIndex);
  }
}
