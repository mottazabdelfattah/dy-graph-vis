import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SequenceComponent } from './sequence/sequence.component';
import { DataService } from './data.services';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  sequenceSettings: any = {}; // To store settings from the control panel
  title = 'dy-graph-vis';
  

  ngOnInit(): void {
    
  }
  constructor() {}

  

  onSettingsChanged(settings: any) {
    this.sequenceSettings = settings; // Update with the new settings
  }
}
