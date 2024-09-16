import { Line } from './line.model';

export interface Edge {
  src: number;
  target: number;
  weight: number;
}

export interface Vertex {
  id: number;
  name: string;
  hcOrder: number;
  rndOrder: number;
}
export class Graph {
  id: number;
  edges: Edge[];
  lines: Line[];
  hcOrder: number;
  dist: number[];
  name: string;
  gWidth: number;
  gHeight: number;

  constructor(id: number) {
    this.id = id;
    this.edges = [];
    this.lines = [];
    this.dist = [];
    this.name = '';
    this.hcOrder = -1;
    this.gWidth = 0;
    this.gHeight = 0;
    
  }
}
