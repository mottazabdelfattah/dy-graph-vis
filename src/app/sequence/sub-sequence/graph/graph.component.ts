import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Edge, Graph, Vertex } from './graph.model';
import { Line } from './line.model';
import { CanvasDrawerService } from '../../../common/canvas-drawer.service';
import { HttpClient } from '@angular/common/http';
import { COLOR_SCHEME, LINE_COLOR_ENCODING, LINE_RENDERING_MODE } from '../sub-sequence.model';


@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.css',
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy  {
  @ViewChild('canvasElement') canvas!: ElementRef<HTMLCanvasElement>;
  @Input({ required: true }) graph!: Graph;
  @Input({ required: true }) lineWidth!: number;
  @Input({ required: true }) renderingMode!: LINE_RENDERING_MODE;
  @Input() blendingFactor: number = 0.5;
  private http = inject(HttpClient);
  private canvasDrawerService!: CanvasDrawerService;
  
  gWidth = 100;
  gHeight = 100;

  ngOnInit(): void {
    this.gHeight = this.graph.gHeight;
    this.gWidth = this.graph.gWidth
  }

  ngAfterViewInit(): void{
    this.canvasDrawerService = new CanvasDrawerService(this.canvas, this.http);
    this.canvasDrawerService.drawLinesBackEnd(
      this.graph.lines,
      this.lineWidth,
      this.renderingMode,
      LINE_COLOR_ENCODING.DENSITY,
      COLOR_SCHEME.GRAY_SCALE
    );

  }

  ngOnDestroy(): void {
    this.canvasDrawerService.terminateWorkers();
  }

  // private getLines(edges: Edge[]): Line[] {
  //   let lines: Line[] = [];
    
  //   edges.forEach((e: Edge) => {
  //     let src = this.vertexList.find((x) => x.id === e.src);
  //     let tar = this.vertexList.find((x) => x.id === e.target);
  //     lines.push({
  //       x1: 0 * this.gWidth,
  //       y1: src ? src.hcOrder * this.vertexHeight : 0,
  //       x2: 1 * this.gWidth,
  //       y2: tar ? tar.hcOrder * this.vertexHeight : 0,
  //     });
  //   });

  //   return lines;
  // }

  // private drawLines(lines: Line[]): void {
    
  //   const canvasElement = this.canvas.nativeElement;
  //   this.context = canvasElement.getContext('2d')!;

  //   this.context.clearRect(0, 0, canvasElement.width, canvasElement.height); // Clear the canvas before drawing

  //   this.context.strokeStyle = 'black';
  //   this.context.lineWidth = 1;

  //   lines.forEach((line: Line) => {
  //     this.context.beginPath();
  //     this.context.moveTo(line.x1, line.y1);
  //     this.context.lineTo(line.x2, line.y2);
  //     this.context.stroke();
  //   });
  // }
}
