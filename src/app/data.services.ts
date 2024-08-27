import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  

  constructor(private http: HttpClient) {}

  // Fetch both files concurrently
  getData(datasetName: string): Observable<{ edges: any; vertices: any, props: any }> {
    return forkJoin({
      edges: this.http.get(`assets/${datasetName}_edges.json`),
      vertices: this.http.get(`assets/${datasetName}_vertices.json`),
      props: this.http.get(`assets/${datasetName}_props.json`)
    }).pipe(
      map(results => {
        return {
          edges: results.edges,
          vertices: results.vertices,
          props:results.props
        };
      })
    );
  }
}
