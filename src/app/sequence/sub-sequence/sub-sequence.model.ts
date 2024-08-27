import { Graph } from './graph/graph.model';


export enum SEQUENCE_ORDERING_METHOD {
  TIME,
  TOPOLOGY_BASED,
  TOPOLOGY_WEIGHTED_BASED,
}

export enum PARTITIONING_METHOD {
  NONE,
  UNIFORM,
  DISTANCE_BASED,
}

export enum LINE_RENDERING_MODE{
    NONE,
    BLENDING,
    SPLATTING
}

export enum VIS_TECHNIQUE {
    MSV,
    IES,
    SEP,
    TEP,
  }

export interface DataItem {
    time: number;
    start: number;
    end: number;
    weight: number;
}

export class SubSequence {
  // start: number;
  // length: number;
  graphs: Graph[];
  SubSequenceRep: Graph|undefined;

  constructor(){
    // this.start = -1;
    // this.length=0;
    this.graphs=[];
    this.SubSequenceRep=undefined;
  }
}
