import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { SubSequenceComponent } from './sub-sequence/sub-sequence.component';
import {
  COLOR_SCHEME,
  EDGE_ORDERING,
  LINE_COLOR_ENCODING,
  LINE_RENDERING_MODE,
  PARTITIONING_METHOD,
  SEQUENCE_ORDERING_METHOD,
  SubSequence,
  VERTEXT_ORDERING,
  VIS_TECHNIQUE,
} from './sub-sequence/sub-sequence.model';
import { SequenceService } from './sequence.service';
import { Vertex } from './sub-sequence/graph/graph.model';
import { DataService } from '../data.services';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sequence',
  standalone: true,
  imports: [SubSequenceComponent],
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
  lineWidth= 1;
  renderingMode = LINE_RENDERING_MODE.BLENDING;
  blendingFactor = 0.5;
  colorScheme = COLOR_SCHEME.GRAY_SCALE;
  colorEncoding = LINE_COLOR_ENCODING.DENSITY;
  vertexOrdering = VERTEXT_ORDERING.HC;
  edgeOrdering = EDGE_ORDERING.FREQUENCY;
  tepBackgroundOpacity= 0.1;
  edgeFreqRangeMin=20;
  edgeFreqRangeMax=80;

  initialSub: SubSequence = new SubSequence();
  subList: SubSequence[] = [];
  vertexList: Vertex[] = [];

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
        previousSettings?.sequenceOrder !==
          currentSettings.sequenceOrder
      ) {
        this.sort(currentSettings.sequenceOrder);
      }

      // which changes trigger repartition
      if (
        previousSettings?.dataset !== currentSettings.dataset ||
        previousSettings?.partitioning !== currentSettings.partitioning ||
        (previousSettings?.intervals !== currentSettings.intervals &&
          this.partitioningMethod === PARTITIONING_METHOD.UNIFORM) ||
          (previousSettings?.threshold !== currentSettings.threshold &&
            this.partitioningMethod !== PARTITIONING_METHOD.UNIFORM)||
        previousSettings?.sequenceOrder !==
          currentSettings.sequenceOrder
      ) {
        this.repartition(currentSettings.partitioning, currentSettings.intervals, currentSettings.threshold);
      }


      if(previousSettings?.dataset !== currentSettings.dataset ||
        previousSettings?.partitioning !== currentSettings.partitioning ||
        (previousSettings?.intervals !== currentSettings.intervals &&
          this.partitioningMethod === PARTITIONING_METHOD.UNIFORM) ||
          (previousSettings?.threshold !== currentSettings.threshold &&
            this.partitioningMethod !== PARTITIONING_METHOD.UNIFORM)||
        previousSettings?.sequenceOrder !==
          currentSettings.sequenceOrder ||
          previousSettings?.edgeFreqRangeMin !==
          currentSettings.edgeFreqRangeMin ||
          previousSettings?.edgeFreqRangeMax !==
          currentSettings.edgeFreqRangeMax
      ) {
        this.filterAggregatedEdges(currentSettings.edgeFreqRangeMin, currentSettings.edgeFreqRangeMax);
      }


      // update other settings
      this.visTechnique = currentSettings.visualization;
      this.stripeWidth = currentSettings.stripeWidth;
      this.vertexHeight = currentSettings.vertexHeight;
      this.lineWidth= currentSettings.lineWidth;
      this.renderingMode = currentSettings.lineRendering;
      this.blendingFactor = currentSettings.blendingFactor;
      this.colorScheme = currentSettings.colorScheme;
      this.colorEncoding=currentSettings.colorEncoding;
      this.vertexOrdering=currentSettings.vertexOrdering;
      this.tepBackgroundOpacity=currentSettings.tepBackgroundOpacity;
      this.edgeOrdering=currentSettings.edgeOrdering;
      
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
      this.vertexList = this.sequenceService.getVertexList(this.jsonVertices);
    }
  }

  private sort(sortingMethod: SEQUENCE_ORDERING_METHOD) {
    this.sequenceOrderMethod = sortingMethod;
    if (this.initialSub.graphs.length > 0) {
      this.sequenceService.sortSubSequence(
        this.initialSub,
        this.sequenceOrderMethod
      );
    }
  }

  private repartition(partitioningMethod: PARTITIONING_METHOD, intervals:number, threshold:number) {
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

    }
  }

  private filterAggregatedEdges(min: number, max:number){
    this.edgeFreqRangeMin=min;
    this.edgeFreqRangeMax=max;
    this.sequenceService.filterSubSequenceAggregateEdges(this.subList, this.edgeFreqRangeMin, this.edgeFreqRangeMax);
  }


  
}
