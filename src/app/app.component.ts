import { Component, OnInit } from '@angular/core';

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
