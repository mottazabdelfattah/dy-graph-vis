import { PLASMA_CROPPED_COLOR_SCHEME } from '../../variables';
import { Edge, Graph } from './graph/graph.model';

export enum COLOR_SCHEME {
  GRAY_SCALE = 'GRAY_SCALE',
  MULTI_HUE = 'MULTI_HUE',
  PLASMA_CROPPED = 'PLASMA_CROPPED',
  PLASMA_WHITE_BACKGROUND = 'PLASMA_WHITE_BACKGROUND',
  INFERNO_CROPPED = 'INFERNO_CROPPED'
}

export enum LINE_COLOR_ENCODING {
  DENSITY = 'DENSITY',
  EDGE_WEIGHT = 'EDGE_WEIGHT',
  LINE_SLOPE = 'LINE_SLOPE',
}

export enum SEQUENCE_ORDERING_METHOD {
  TIME = 'TIME',
  TOPOLOGY_BASED = 'TOPOLOGY_BASED',
  // TOPOLOGY_WEIGHTED_BASED = 'TOPOLOGY_WEIGHTED_BASED',
}

export enum PARTITIONING_METHOD {
  UNIFORM = 'UNIFORM',
  DISTANCE_TO_PREVIOUS_POINT = 'DISTANCE_TO_PREVIOUS_POINT',
  AVERAGE_PAIRWISE_DISTANCE = 'AVERAGE_PAIRWISE_DISTANCE',
}

export enum LINE_RENDERING_MODE {
  NONE = 'NONE',
  BLENDING = 'BLENDING',
  // SPLATTING = 'SPLATTING',
}

export enum VIS_TECHNIQUE {
  MSV = 'MSV',
  IES = 'IES',
  SEP = 'SEP',
  TEP = 'TEP',
}

export enum SEP_STRIPE{
  START = 'First stripe',
  END = 'Last stripe'
}

export enum EDGE_FILTERING{
  BY_SELECTED_SRC = 'By source vertices',
  BY_SELECTED_TAR = 'By target vertices',
  BY_SELECTED_SRC_TAR = 'By source and target vertices',
}

export enum CANVAS_SELECTION_MODE{
  VERTICES = 'VERTICES',
  TIMEPOINTS = 'TIMEPOINTS'
}

export enum VERTEXT_ORDERING {
  'HC' = 'HC',
  'RANDOM' = 'RANDOM'
}

export enum  EDGE_ORDERING {
  'FREQUENCY' = 'FREQUENCY',
  'WEIGHT' = 'WEIGHT'
}

export interface DataItem {
  time: number;
  start: number;
  end: number;
  weight: number;
}

export class SubSequence {
  width: number;
  height: number;
  graphs: Graph[];
  aggEdges: {edge :Edge, frq: number}[];
  aggEdgesFiltered: {edge :Edge, frq: number}[];
  excludedAggEdges: {edge :Edge, frq: number}[];
  // minEdgeWeight: number;
  maxEdgeWeight: number;

  constructor() {
    this.width = 0;
    this.height = 0;
    this.graphs = [];
    this.aggEdges=[];
    this.aggEdgesFiltered=[];
    this.excludedAggEdges=[];
    this.maxEdgeWeight = 0;
    // this.minEdgeWeight = 0;
  }
}
