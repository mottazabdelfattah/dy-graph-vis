import { Injectable } from '@angular/core';
import {
  DataItem,
  PARTITIONING_METHOD,
  SEQUENCE_ORDERING_METHOD,
  SubSequence,
} from './sub-sequence/sub-sequence.model';
import { Graph, Edge, Vertex } from './sub-sequence/graph/graph.model';

@Injectable({ providedIn: 'root' })
export class SequenceService {
  getSubSequences(
    rootSub: SubSequence,
    partitioningMethod: PARTITIONING_METHOD,
    partitioningThreshold: number,
    nIntervals: number,
  ): SubSequence[] {
    if (partitioningMethod === PARTITIONING_METHOD.UNIFORM && nIntervals > 0) {
        return this.getUniformSubSequence(rootSub, nIntervals);
    } else if (partitioningMethod === PARTITIONING_METHOD.DISTANCE_BASED) {
      return [rootSub];
    } else {
      return [rootSub];
    }
  }

  getUniformSubSequence(
    rootSub: SubSequence,
    nIntervals: number
  ): SubSequence[] {
    
    const subSize = Math.ceil(rootSub.graphs.length / nIntervals);
    let subSequences: SubSequence[] = new Array(nIntervals);
    
    for(let i = 0; i < nIntervals; i++) {
        subSequences[i] = new SubSequence();
        // subSequences[i].length= subSequences[i].start+subSize>rootSub.length?rootSub.length-subSequences[i].start: subSize;
    }
    for (let i = 0; i < rootSub.graphs.length; i++) {
        const subIndex = Math.floor(i/subSize);
        subSequences[subIndex].graphs.push(rootSub.graphs[i]);
    }
    return subSequences;
  }

  

  getInitialSubSequence(edges: any, props:any): SubSequence {
    const all = new SubSequence();

    // Convert and map each 'edge' to a properly typed DataItem
    const convertedEdges: DataItem[] = edges.map((e:any) => ({
      time: parseInt(e.time, 10),
      start: parseInt(e.start, 10),
      end: parseInt(e.end, 10),
      weight: parseInt(e.weight, 10)
    }));
    // Grouping by the 'time' variable
    const groupedData = convertedEdges.reduce((acc: any, item: any) => {
      if (!acc[item.time]) {
        acc[item.time] = [];
      }
      acc[item.time].push(item);
      return acc;
    }, {} as Record<string, DataItem[]>);

    //console.log(groupedData);
    for (const [time, items] of Object.entries(groupedData) as [
      string,
      DataItem[]
    ][]) {
      const g = new Graph(parseInt(time, 10));
      // assign graph props
      const gProps = props.find((item:any) => item.g_id === g.id);
      g.hcOrder = gProps.hc_order;
      
      items.forEach((item) => {
        g.edges.push({
          src: item.start+0,
          target: item.end+0,
          weight: item.weight+0,
        });
      });

      all.graphs.push(g);
    }
    // all.start = 0;
    // all.length = all.graphs.length;
    return all;
  }


  getVertexList(vertices:any): Vertex[]{
    let vertList: Vertex[] = [];
    vertices.forEach((v:any) =>{
        vertList.push({id:v.id, hcOrder:v.hc_order});
    });
    return vertList;
  }

  sortSubSequence(rootSub: SubSequence, sortingMethod: SEQUENCE_ORDERING_METHOD){
    switch(sortingMethod){
      case SEQUENCE_ORDERING_METHOD.TIME:
        rootSub.graphs.sort((a, b) => a.id - b.id);
        break;
      case SEQUENCE_ORDERING_METHOD.TOPOLOGY_BASED:
      case SEQUENCE_ORDERING_METHOD.TOPOLOGY_WEIGHTED_BASED:
        rootSub.graphs.sort((a, b) => a.hcOrder - b.hcOrder);
        break;
    }
    
  }
}
