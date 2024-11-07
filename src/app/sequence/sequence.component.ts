import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { SubSequenceComponent } from './sub-sequence/sub-sequence.component';
import {
  CANVAS_SELECTION_MODE,
  COLOR_SCHEME,
  EDGE_FILTERING,
  EDGE_ORDERING,
  LINE_COLOR_ENCODING,
  LINE_ORDERING,
  LINE_RENDERING_MODE,
  PARTITIONING_METHOD,
  SEP_STRIPE,
  SEQUENCE_ORDERING_METHOD,
  SubSequence,
  VERTEXT_ORDERING,
  VIS_TECHNIQUE,
} from './sub-sequence/sub-sequence.model';
import { SequenceService } from './sequence.service';
import { Edge, Vertex } from './sub-sequence/graph/graph.model';
import { DataService } from '../data.services';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sequence',
  standalone: true,
  imports: [SubSequenceComponent, CommonModule, FormsModule],
  templateUrl: './sequence.component.html',
  styleUrl: './sequence.component.css',
})
export class SequenceComponent implements OnChanges, OnInit {
  @Input() settings: any;

  jsonVertices: any;
  jsonEdges: any;
  jsonProps: any;
  partitioningThreshold = -1;
  partitioningMethod = PARTITIONING_METHOD.UNIFORM;
  sequenceOrderMethod = SEQUENCE_ORDERING_METHOD.TOPOLOGY_BASED;
  uniformIntervals = 1;

  visTechnique = VIS_TECHNIQUE.MSV;
  stripeWidth = 1;
  vertexHeight = 1;
  lineWidth = 1;
  renderingMode = LINE_RENDERING_MODE.BLENDING_COLORING;
  blendingFactor = 0.5;
  colorScheme = COLOR_SCHEME.INFERNO_CROPPED;
  colorEncoding = LINE_COLOR_ENCODING.DENSITY;
  vertexOrdering = VERTEXT_ORDERING.HC;
  edgeOrdering = EDGE_ORDERING.FREQUENCY;
  tepBackgroundOpacity = 0.1;
  edgeFreqRangeMin = 0;
  edgeFreqRangeMax = 100;
  sepStripeOp = SEP_STRIPE.START;
  edgeFiltering = EDGE_FILTERING.BY_SELECTED_SRC;
  canvasSelectionMode = CANVAS_SELECTION_MODE.TIMEPOINTS;
  isDiffMode = false;
  isManPartitioning = false;
  lineOrdering = LINE_ORDERING.LENGTH;
  isLineOrderingAscending = true;
  isSeqOrderingAscending = true;

  initialSub: SubSequence = new SubSequence();
  subList: SubSequence[] = [];
  vertexList: Vertex[] = [];
  // isDiffMode: boolean = false; 
  selectedSubs: boolean[] = []; // Track which canvases are selected

  constructor(
    private sequenceService: SequenceService,
    private dataService: DataService
  ) {}
  ngOnInit(): void {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['settings'] && changes['settings'].currentValue) {
      const currentSettings = changes['settings'].currentValue;
      const previousSettings = changes['settings'].previousValue;

      // which changes trigger loadDataset & updateInitialSub
      if (previousSettings?.dataset !== currentSettings.dataset) {
        try {
          // Await the dataset load to complete before proceeding
          await this.loadDataset(currentSettings.dataset);
          console.log('Dataset loaded successfully');
          this.updateInitialSub();
        } catch (error) {
          console.error('Error loading dataset:', error);
          return; // Optionally halt further execution if dataset loading fails
        }
      }

      // which changes trigger sort
      if (
        previousSettings?.dataset !== currentSettings.dataset ||
        previousSettings?.sequenceOrder !== currentSettings.sequenceOrder ||
        previousSettings?.isSeqOrderingAscending !== currentSettings.isSeqOrderingAscending
      ) {
        this.sort(currentSettings.sequenceOrder, currentSettings.isSeqOrderingAscending);
      }

      // which changes trigger repartition
      if (
        previousSettings?.dataset !== currentSettings.dataset ||
        previousSettings?.partitioning !== currentSettings.partitioning ||
        (previousSettings?.intervals !== currentSettings.intervals &&
          this.partitioningMethod === PARTITIONING_METHOD.UNIFORM) ||
        (previousSettings?.threshold !== currentSettings.threshold &&
          this.partitioningMethod !== PARTITIONING_METHOD.UNIFORM) ||
        previousSettings?.sequenceOrder !== currentSettings.sequenceOrder ||
        previousSettings?.isSeqOrderingAscending !== currentSettings.isSeqOrderingAscending
      ) {
        this.repartition(
          currentSettings.partitioning,
          currentSettings.intervals,
          currentSettings.threshold
        );
      }

      if( previousSettings?.dataset !== currentSettings.dataset ||
        previousSettings?.partitioning !== currentSettings.partitioning ||
        (previousSettings?.intervals !== currentSettings.intervals &&
          this.partitioningMethod === PARTITIONING_METHOD.UNIFORM) ||
        (previousSettings?.threshold !== currentSettings.threshold &&
          this.partitioningMethod !== PARTITIONING_METHOD.UNIFORM) ||
        previousSettings?.sequenceOrder !== currentSettings.sequenceOrder||
        previousSettings?.diffMode !== currentSettings.diffMode){
          
        this.toggleDifference(currentSettings.diffMode);
      }

      // update other settings
      this.visTechnique = currentSettings.visualization;
      this.stripeWidth = currentSettings.stripeWidth;
      this.vertexHeight = currentSettings.vertexHeight;
      this.lineWidth = currentSettings.lineWidth;
      this.renderingMode = currentSettings.lineRendering;
      this.blendingFactor = currentSettings.blendingFactor;
      this.colorScheme = currentSettings.colorScheme;
      this.colorEncoding = currentSettings.colorEncoding;
      this.vertexOrdering = currentSettings.vertexOrdering;
      this.tepBackgroundOpacity = currentSettings.tepBackgroundOpacity;
      this.edgeOrdering = currentSettings.edgeOrdering;
      this.sepStripeOp = currentSettings.sepStripeOp;
      this.edgeFreqRangeMin = currentSettings.edgeFreqRangeMin;
      this.edgeFreqRangeMax = currentSettings.edgeFreqRangeMax;
      this.edgeFiltering = currentSettings.edgeFiltering;
      this.canvasSelectionMode = currentSettings.canvasSelectionMode;
      this.isManPartitioning = currentSettings.isManPartitioning;
      this.lineOrdering = currentSettings.lineOrdering;
      this.isLineOrderingAscending = currentSettings.isLineOrderingAscending;
    }
  }

  private async loadDataset(datasetName: string): Promise<void> {
    try {
      const data = await firstValueFrom(this.dataService.getData(datasetName));
      this.jsonEdges = data.edges;
      this.jsonVertices = data.vertices;
      this.jsonProps = data.props;
    } catch (error) {
      console.error('Error loading dataset:', error);
      throw error; // Re-throw the error to handle it in the calling method
    }
  }

  private updateInitialSub() {
    if (this.jsonEdges && this.jsonVertices && this.jsonProps) {
      this.initialSub = this.sequenceService.getInitialSubSequence(
        this.jsonEdges,
        this.jsonProps
      );

      

      // Filter the jsonVertices array based on the top x% vertex IDs
      const aggEdges = this.sequenceService.getSubSequenceAggregateEdges(
        this.initialSub
      );
      const topXPercentVertexIds = this.getTopXPercentVertices(aggEdges, 100);
      const filteredVertices = this.jsonVertices.filter((vertex: any) =>
        topXPercentVertexIds.includes(vertex.id)
      );
      this.vertexList = this.sequenceService.getVertexList(filteredVertices);
      const vertexIds = new Set(this.vertexList.map((vertex) => vertex.id));

      // filter graph edges accordingly
      this.initialSub.graphs.forEach((g) => {
        const filtered = g.edges.filter(
          (e) => vertexIds.has(e.src) && vertexIds.has(e.target)
        );
        g.edges = filtered;
      });
    }

    this.LogAvgDensity();
  }

  private getTopXPercentVertices(
    aggEdges: { edge: Edge; frq: number }[],
    x: number
  ): number[] {
    const vertexEdgeCount: Map<number, number> =
      this.sequenceService.getEdgeCountPerVertex(aggEdges);
    // Convert the Map to an array of [vertex, count] pairs
    const vertexArray = Array.from(vertexEdgeCount.entries());

    // Sort the array by the edge count in descending order
    vertexArray.sort((a, b) => b[1] - a[1]);

    // Calculate how many vertices are in the top 10%
    const topPercentageCount = Math.ceil(vertexArray.length * (x / 100));

    // Return an array of vertex IDs that are in the top 10%
    return vertexArray.slice(0, topPercentageCount).map(([vertex]) => vertex);
  }

  private sort(sortingMethod: SEQUENCE_ORDERING_METHOD, isAsc:boolean) {
    this.sequenceOrderMethod = sortingMethod;
    this.isSeqOrderingAscending = isAsc;
    if (this.initialSub.graphs.length > 0) {
      this.sequenceService.sortSubSequence(
        this.initialSub,
        this.sequenceOrderMethod,
        this.isSeqOrderingAscending
      );
    }
  }

  private repartition(
    partitioningMethod: PARTITIONING_METHOD,
    intervals: number,
    threshold: number
  ) {
    this.partitioningMethod = partitioningMethod;
    this.uniformIntervals = intervals;
    this.partitioningThreshold = threshold;
    if (this.initialSub.graphs.length > 0) {
      this.subList = this.sequenceService.getSubSequences(
        this.initialSub,
        this.partitioningMethod,
        this.partitioningThreshold,
        this.uniformIntervals
      );
      this.selectedSubs = new Array(this.subList.length).fill(false);
    }
  }
  toggleDifference(diffMode: boolean) {
    this.isDiffMode = diffMode;
    if (!this.isDiffMode) {
      this.resetSelectedSubs(); // Reset selected canvases to original state
    } else {
      this.computeDifference(); // Compute and subtract intersection from selected canvases
    }
  }

  resetSelectedSubs() {
    this.selectedSubs.forEach((selected, index) => {
      if (selected) {
        this.subList[index] = { ...this.subList[index], excludedAggEdges: [] };
      }
    });
  }
  computeDifference() {
    const selectedIndices = this.selectedSubs
      .map((selected, index) => (selected ? index : -1))
      .filter(index => index !== -1);

    if (selectedIndices.length < 2) {
      console.warn('Select at least two canvases to compute the difference');
      return;
    }

    // Find the intersection of aggEdges across all subs
    let intersection = this.subList[selectedIndices[0]].aggEdges;
    for (let i = 1; i < selectedIndices.length; i++) {
      intersection = this.sequenceService.findOptimizedIntersection(intersection, this.subList[selectedIndices[i]].aggEdges);
    }

    // exclude the intersection from each selected subs
    selectedIndices.forEach(index => {
      this.subList[index] = { ...this.subList[index], excludedAggEdges: intersection };
    });

  }

  LogAvgDensity(){
    const densities: number[] = [];
    this.initialSub.graphs.forEach((g)=>{
      densities.push(g.edges.length/this.vertexList.length);
    })
    const sum = densities.reduce((acc, curr) => acc + curr, 0); // Sum all numbers
    const Density = sum / densities.length;
    // console.log(`vertices:${this.vertexList.length}`);
    // console.log(`timepoints:${this.initialSub.graphs.length}`);
    // console.log(`avg density:${Density}`);
    
  }
  

  handleSplitAction(subSplitIndex: number, subIndex: number) {
    // console.log(`subIndex=${subIndex} and subSplitIndex=${subSplitIndex}`);
    this.sequenceService.refinePartitioning(this.subList, subIndex, subSplitIndex);
    this.selectedSubs = new Array(this.subList.length).fill(false);
  }
}
