import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { SIPRI_VERTICES } from '../../data/sipri_vertices';
// import { SIPRI_EDGES } from '../../data/sipri_edges';
// import { WGCOBERTURA_VERTICES } from '../../data/wgcobertura_vertices';
// import { WGCOBERTURA_EDGES } from '../../data/wgcobertura.edges';
import { SequenceComponent } from './sequence/sequence.component';
import { DataService } from './data.services';

@Component({
  selector: 'app-root',
  standalone: false,
  //imports: [RouterOutlet, SequenceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
//wgcobertura
  ngOnInit(): void {
    this.dataService.getData('flight').subscribe(data => {
      this.gEdges = data.edges;
      this.gVertices = data.vertices;
      this.gProps = data.props;
    });
  }
  constructor(private dataService: DataService) {}

  title = 'dy-graph-vis';
  gVertices:any;// = FLIGHT_VERTICES;
  gEdges:any;// = FLIGHT_EDGES;
  gProps: any
}
