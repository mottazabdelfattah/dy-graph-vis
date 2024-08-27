import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { SubSequenceComponent } from './sub-sequence/sub-sequence.component';
import {
  PARTITIONING_METHOD,
  SEQUENCE_ORDERING_METHOD,
  SubSequence,
} from './sub-sequence/sub-sequence.model';
import { SequenceService } from './sequence.service';
import { Vertex } from './sub-sequence/graph/graph.model';

@Component({
  selector: 'app-sequence',
  standalone: true,
  imports: [SubSequenceComponent],
  templateUrl: './sequence.component.html',
  styleUrl: './sequence.component.css',
})
export class SequenceComponent implements OnChanges, OnInit {
  @Input({ required: true }) jsonVertices!: any;
  @Input({ required: true }) jsonEdges!: any;
  @Input({ required: true }) jsonProps!: any;
  @Input() partitioningThreshold = -1;
  @Input() partitioningMethod = PARTITIONING_METHOD.UNIFORM;
  @Input() sequenceOrderMethod = SEQUENCE_ORDERING_METHOD.TOPOLOGY_BASED;
  @Input() uniformIntervals = 1;

  initialSub: SubSequence = new SubSequence();
  subList: SubSequence[] = [];
  vertexList: Vertex[] = [];

  constructor(private sequenceService: SequenceService) {}
  ngOnInit(): void {  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partitioningThreshold'] || changes['partitioningMethod']) {
      this.repartition();
    
    }else if(changes['sequenceOrderMethod']){
      this.sort();
      this.repartition();

    }else if(changes['jsonVertices'] || changes['jsonEdges'] || changes['jsonProps']){
      this.updateInitialSub();
      this.sort();
      this.repartition();
    }
  }


  private sort(){
    if(this.initialSub.graphs.length>0){
      this.sequenceService.sortSubSequence(this.initialSub, this.sequenceOrderMethod);
    }
  }

  private repartition(){
    if(this.initialSub.graphs.length>0){
      this.subList = this.sequenceService.getSubSequences(
        this.initialSub,
        this.partitioningMethod,
        this.partitioningThreshold,
        this.uniformIntervals
      );
    }
    
  }

  private updateInitialSub(){
    if (this.jsonEdges && this.jsonVertices && this.jsonProps) {
      this.initialSub = this.sequenceService.getInitialSubSequence(this.jsonEdges, this.jsonProps);
      this.vertexList = this.sequenceService.getVertexList(this.jsonVertices);
      console.log(this.initialSub);
      console.log(this.subList);
    }
  }
}
