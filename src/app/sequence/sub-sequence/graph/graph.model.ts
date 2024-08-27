import { Line } from "./line.model";

export interface Edge {
  src: number;
  target: number;
  weight: number;
}

export interface Vertex {
  id: number;
  hcOrder: number;
}
export class Graph {
  id: number;
  edges: Edge[];
  lines: Line[];
  hcOrder: number;
  hcOrderWeigted: number;
  gWidth: number;
  gHeight:number;

  constructor(id: number) {
    this.id = id;
    this.edges = [];
    this.lines = [];
    this.hcOrder = -1;
    this.hcOrderWeigted = -1;
    this.gWidth = 0;
    this.gHeight=0;
  }
}
