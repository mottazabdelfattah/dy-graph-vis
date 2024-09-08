import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { COLOR_SCHEME, EDGE_ORDERING, LINE_COLOR_ENCODING, LINE_RENDERING_MODE, PARTITIONING_METHOD, SEQUENCE_ORDERING_METHOD, VERTEXT_ORDERING, VIS_TECHNIQUE } from '../sequence/sub-sequence/sub-sequence.model';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.css'
})
export class ControlPanelComponent implements OnInit{
  @Output() settingsChanged = new EventEmitter<any>(); // Emit form changes

  controlForm: FormGroup;
  edgeFreqRangeValues: number[] = [20, 80]; // Default values for the range slider
  datasets = ['sipri', 'flight', 'wgcobertura', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
  visualizationTechniques = Object.values(VIS_TECHNIQUE); // Converts enum to array of values
  sequenceOrderingMethods = Object.values(SEQUENCE_ORDERING_METHOD);
  partitioningMethods = Object.values(PARTITIONING_METHOD);
  vertexOrderingMethods = Object.values(VERTEXT_ORDERING);
  edgeOrderingMethods = Object.values(EDGE_ORDERING);
  lineRenderingMethods = Object.values(LINE_RENDERING_MODE);
  colorSchemeList = Object.values(COLOR_SCHEME);
  colorEncodingList = Object.values(LINE_COLOR_ENCODING);

  PARTITIONING_METHOD = PARTITIONING_METHOD;
  LINE_RENDERING_MODE = LINE_RENDERING_MODE;
  VIS_TECHNIQUE = VIS_TECHNIQUE;

  constructor(private fb: FormBuilder){
    this.controlForm = this.fb.group({
      dataset: ['sipri'],
      visualization: '',
      sequenceOrder: [SEQUENCE_ORDERING_METHOD.TIME],
      partitioning: [PARTITIONING_METHOD.UNIFORM],
      intervals: [1],
      vertexOrdering: [VERTEXT_ORDERING.HC],
      edgeOrdering:[EDGE_ORDERING.FREQUENCY],
      colorScheme: COLOR_SCHEME.GRAY_SCALE,
      colorEncoding: LINE_COLOR_ENCODING.DENSITY,
      lineRendering: [LINE_RENDERING_MODE.BLENDING],
      blendingFactor: [0.5],
      lineWidth: [1],
      stripeWidth: [1],
      vertexHeight: [1],
      edgeFreqRangeMin: [this.edgeFreqRangeValues[0]], // Initialize tepRangeMin
      edgeFreqRangeMax: [this.edgeFreqRangeValues[1]], // Initialize tepRangeMax
      tepBackgroundOpacity:[0.1],
      threshold: [0.5]
    });

  }

  setupDebounce() {
    this.controlForm.valueChanges.pipe(
      debounceTime(300) // 300ms debounce time
    ).subscribe((newValues) => {
      // Trigger your update or change detection logic here
      this.onSettingsChange(newValues);
    });
  }

  onSettingsChange(newValues: any) {
    // Emit changes whenever the form values change
    this.settingsChanged.emit(newValues);
  }

  ngOnInit(): void {

    // Listen to changes in the tepRangeValues array
    this.controlForm.get('edgeFreqRangeMin')?.valueChanges.subscribe((value) => {
      this.edgeFreqRangeValues[0] = value;
    });

    this.controlForm.get('edgeFreqRangeMax')?.valueChanges.subscribe((value) => {
      this.edgeFreqRangeValues[1] = value;
    });

    // this.controlForm.get('partitioning')?.valueChanges.subscribe(value => {
    //   if (value !== PARTITIONING_METHOD.UNIFORM) {
    //     this.controlForm.get('intervals')?.setValue(1);
    //   }
    // });

    // this.controlForm.get('lineRendering')?.valueChanges.subscribe(value => {
    //   if (value !== LINE_RENDERING_MODE.BLENDING) {
    //     this.controlForm.get('blendingFactor')?.setValue(0.5);
    //   }
    // });

    
    this.setupDebounce(); // Debounced subscription to form changes
  }

  updateRange() {
    const min = (document.getElementById('edgeFreqRangeMin') as HTMLInputElement).value;
    const max = (document.getElementById('edgeFreqRangeMax') as HTMLInputElement).value;

    if (+min >= +max) {
      (document.getElementById('edgeFreqRangeMin') as HTMLInputElement).value = max;
      this.edgeFreqRangeValues[0] = +max;
    } else {
      this.edgeFreqRangeValues[0] = +min;
      this.edgeFreqRangeValues[1] = +max;
    }
  }
}
