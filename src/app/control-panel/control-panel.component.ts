import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { COLOR_SCHEME, LINE_COLOR_ENCODING, LINE_RENDERING_MODE, PARTITIONING_METHOD, SEQUENCE_ORDERING_METHOD, VIS_TECHNIQUE } from '../sequence/sub-sequence/sub-sequence.model';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.css'
})
export class ControlPanelComponent implements OnInit{
  @Output() settingsChanged = new EventEmitter<any>(); // Emit form changes

  controlForm: FormGroup;

  datasets = ['sipri', 'flight', 'wgcobertura'];
  visualizationTechniques = Object.values(VIS_TECHNIQUE); // Converts enum to array of values
  sequenceOrderingMethods = Object.values(SEQUENCE_ORDERING_METHOD);
  partitioningMethods = Object.values(PARTITIONING_METHOD);
  vertexOrderingMethods = ['Order 1', 'Order 2', 'Order 3'];
  lineRenderingMethods = Object.values(LINE_RENDERING_MODE);
  colorSchemeList = Object.values(COLOR_SCHEME);
  colorEncodingList = Object.values(LINE_COLOR_ENCODING);

  PARTITIONING_METHOD = PARTITIONING_METHOD;
  LINE_RENDERING_MODE = LINE_RENDERING_MODE;

  constructor(private fb: FormBuilder){
    this.controlForm = this.fb.group({
      dataset: ['sipri'],
      visualization: '',
      sequenceOrder: [SEQUENCE_ORDERING_METHOD.TIME],
      partitioning: [PARTITIONING_METHOD.UNIFORM],
      intervals: [1],
      vertexOrdering: ['Order 1'],
      colorScheme: COLOR_SCHEME.GRAY_SCALE,
      colorEncoding: LINE_COLOR_ENCODING.DENSITY,
      lineRendering: [LINE_RENDERING_MODE.BLENDING],
      blendingFactor: [0.5],
      lineWidth: [1],
      stripeWidth: [1],
      vertexHeight: [1]
    });
  }

  ngOnInit(): void {
    this.controlForm.get('partitioning')?.valueChanges.subscribe(value => {
      if (value !== PARTITIONING_METHOD.UNIFORM) {
        this.controlForm.get('intervals')?.setValue(1);
      }
    });

    // this.controlForm.get('lineRendering')?.valueChanges.subscribe(value => {
    //   if (value !== LINE_RENDERING_MODE.BLENDING) {
    //     this.controlForm.get('blendingFactor')?.setValue(0.5);
    //   }
    // });

    // Emit changes whenever the form values change
    this.controlForm.valueChanges.subscribe((formValues) => {
      this.settingsChanged.emit(formValues);
    });
  }
}
