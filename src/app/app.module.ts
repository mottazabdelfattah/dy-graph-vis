import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule

import { AppComponent } from './app.component';
import { DataService } from './data.services'; // Import your service
import { SequenceComponent } from './sequence/sequence.component';
import { RouterOutlet } from '@angular/router';
import { ControlPanelComponent } from "./control-panel/control-panel.component";

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule, // Add HttpClientModule here
    RouterOutlet, SequenceComponent,
    ControlPanelComponent
],
  providers: [DataService], // Ensure your service is provided
  bootstrap: [AppComponent]
})
export class AppModule { }
