import { Injectable } from '@angular/core';
import {
  DataItem,
  PARTITIONING_METHOD,
  SEQUENCE_ORDERING_METHOD,
  SubSequence,
} from './sub-sequence/sub-sequence.model';
import { Graph, Edge, Vertex } from './sub-sequence/graph/graph.model';
import { UtilService } from '../common/util.service';

@Injectable({ providedIn: 'root' })
export class SequenceService {
  constructor(private utilService: UtilService) {}

  filterSubSequenceAggregateEdges(
    subseqList: SubSequence[],
    aggEdgeMinFreq: number,
    aggEdgeMaxFreq: number
  ) {
    // filter aggregated edges per subseq
    subseqList.forEach((s) => {
      // filterAggEdges
      s.aggEdgesFiltered = s.aggEdges.filter(
        (agg) =>
          (agg.frq / s.graphs.length) * 100 >= aggEdgeMinFreq &&
          (agg.frq / s.graphs.length) * 100 <= aggEdgeMaxFreq
      );
    });
  }

  getSubSequences(
    rootSub: SubSequence,
    partitioningMethod: PARTITIONING_METHOD,
    partitioningThreshold: number,
    nIntervals: number
  ): SubSequence[] {
    let subseqList: SubSequence[] = [];
    if (partitioningMethod === PARTITIONING_METHOD.UNIFORM && nIntervals > 0) {
      subseqList = this.getUniformSubSequence(rootSub, nIntervals);
    } else if (
      partitioningMethod === PARTITIONING_METHOD.DISTANCE_TO_PREVIOUS_POINT
    ) {
      subseqList = this.getDistanceBasedSubSequences(
        rootSub,
        partitioningThreshold
      );
    } else if (
      partitioningMethod === PARTITIONING_METHOD.AVERAGE_PAIRWISE_DISTANCE
    ) {
      subseqList = this.getAVGDistanceBasedSubSequences(
        rootSub,
        partitioningThreshold
      );
    }

    // update aggregated edges
    subseqList.forEach((s) => {
      s.aggEdges = this.getSubSequenceAggregateEdges(s);
    });

    return subseqList;
  }

  getAVGDistanceBasedSubSequences(
    rootSub: SubSequence,
    threshold: number
  ): SubSequence[] {
    let subSequences: SubSequence[] = [];
    let currentSub = new SubSequence();
    currentSub.graphs.push(rootSub.graphs[0]);

    for (let i = 1; i < rootSub.graphs.length; i++) {
      const currentTimepoint = rootSub.graphs[i];
      
      // get pairwise distances between currentTimepoint and all prev points in current_cluster
      const distances:number[] = [];
      currentSub.graphs.forEach((g) => {
        distances.push(currentTimepoint.dist[g.id - 1]);
      });
      // Compute the average distance
      const sum = distances.reduce((acc, curr) => acc + curr, 0); // Sum all numbers
      const avgDistance = sum / distances.length;


      if (avgDistance > threshold) {
        //Start a new cluster
        subSequences.push(currentSub);
        const newSub = new SubSequence();
        newSub.graphs.push(currentTimepoint);
        currentSub = newSub;
      } else {
        // Add the current time point to the existing cluster
        currentSub.graphs.push(currentTimepoint);
      }
    }
    subSequences.push(currentSub);

    // update max edge weight
    subSequences.forEach((sub) => {
      sub.maxEdgeWeight = rootSub.maxEdgeWeight;
    });

    return subSequences;
  }

  getDistanceBasedSubSequences(
    rootSub: SubSequence,
    threshold: number
  ): SubSequence[] {
    let subSequences: SubSequence[] = [];
    let currentSub = new SubSequence();
    currentSub.graphs.push(rootSub.graphs[0]);

    for (let i = 1; i < rootSub.graphs.length; i++) {
      const currentTimepoint = rootSub.graphs[i];
      const previousTimepoint = rootSub.graphs[i - 1];

      // get the distance
      const dist = currentTimepoint.dist[previousTimepoint.id - 1];
      if (dist > threshold) {
        //Start a new cluster
        subSequences.push(currentSub);
        const newSub = new SubSequence();
        newSub.graphs.push(currentTimepoint);
        currentSub = newSub;
      } else {
        // Add the current time point to the existing cluster
        currentSub.graphs.push(currentTimepoint);
      }
    }
    subSequences.push(currentSub);

    // update max edge weight
    subSequences.forEach((sub) => {
      sub.maxEdgeWeight = rootSub.maxEdgeWeight;
    });

    return subSequences;
  }

  getUniformSubSequence(
    rootSub: SubSequence,
    nIntervals: number
  ): SubSequence[] {
    const subSize = Math.ceil(rootSub.graphs.length / nIntervals);
    let subSequences: SubSequence[] = new Array(nIntervals);

    for (let i = 0; i < nIntervals; i++) {
      subSequences[i] = new SubSequence();
      subSequences[i].maxEdgeWeight = rootSub.maxEdgeWeight;
    }
    for (let i = 0; i < rootSub.graphs.length; i++) {
      const subIndex = Math.floor(i / subSize);
      subSequences[subIndex].graphs.push(rootSub.graphs[i]);
    }
    return subSequences;
  }

  getInitialSubSequence(edges: any, props: any): SubSequence {
    const all = new SubSequence();

    const edgeWeights: Float32Array = new Float32Array(
      edges.map((e: any) => parseFloat(e.weight))
    );
    // Find the maximum and minimum edge weights
    all.maxEdgeWeight = this.utilService.findMax(edgeWeights);
    // all.minEdgeWeight = this.utilService.findMin(edgeWeights);

    // Convert and map each 'edge' to a properly typed DataItem
    const convertedEdges: DataItem[] = edges.map((e: any) => ({
      time: parseInt(e.time, 10),
      start: parseInt(e.start, 10),
      end: parseInt(e.end, 10),
      weight: parseInt(e.weight, 10),
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
      const gProps = props.find((item: any) => item.g_id === g.id);
      g.hcOrder = gProps.hc_order;
      g.dist = gProps.dist;
      g.name = String(gProps.name);

      items.forEach((item) => {
        g.edges.push({
          src: item.start + 0,
          target: item.end + 0,
          weight: item.weight + 0,
        });
      });

      all.graphs.push(g);
    }

    return all;
  }

  getVertexList(vertices: any): Vertex[] {
    let vertList: Vertex[] = [];
    vertices.forEach((v: any) => {
      vertList.push({
        id: v.id,
        hcOrder: v.hc_order,
        rndOrder: v.rnd_order,
        name: String(v.name),
      });
    });
    return vertList;
  }

  sortSubSequence(
    rootSub: SubSequence,
    sortingMethod: SEQUENCE_ORDERING_METHOD
  ) {
    switch (sortingMethod) {
      case SEQUENCE_ORDERING_METHOD.TIME:
        rootSub.graphs.sort((a, b) => a.id - b.id);
        break;
      case SEQUENCE_ORDERING_METHOD.TOPOLOGY_BASED:
      case SEQUENCE_ORDERING_METHOD.TOPOLOGY_WEIGHTED_BASED:
        rootSub.graphs.sort((a, b) => a.hcOrder - b.hcOrder);
        break;
    }
  }

  getSubSequenceAggregateEdges(
    sub: SubSequence
  ): { edge: Edge; frq: number }[] {
    const aggEdges: { edge: Edge; frq: number }[] = [];
    sub.graphs.forEach((g) => {
      g.edges.forEach((e) => {
        let foundTuple = aggEdges.find(
          (ae) => ae.edge.src === e.src && ae.edge.target === e.target
        );
        if (!foundTuple) {
          foundTuple = {
            edge: { src: e.src, target: e.target, weight: 0 },
            frq: 0,
          };
          aggEdges.push(foundTuple);
        }
        foundTuple.frq++;
        foundTuple.edge.weight += e.weight;
      });
    });

    // average edge weights by thier frequency
    aggEdges.forEach((tuple) => {
      tuple.edge.weight /= tuple.frq;
    });

    return aggEdges;
  }
}
