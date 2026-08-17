import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { PerformanceChartPoint } from '@bnb-marketplace/shared-types';

@Component({
  selector: 'app-performance-chart',
  standalone: true,
  template: `
    <div>
      <h4 class="mb-3 font-mono-data text-xs uppercase tracking-wider text-surface-500">{{ title }}</h4>
      <svg #chartSvg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full" [style.height.px]="height">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#c4ff0e" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#c4ff0e" stop-opacity="0" />
          </linearGradient>
        </defs>
        @if (pathD) {
          <path [attr.d]="areaD" fill="url(#chartGradient)" />
          <path [attr.d]="pathD" fill="none" stroke="#c4ff0e" stroke-width="2" />
        }
      </svg>
    </div>
  `,
})
export class PerformanceChartComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) data!: PerformanceChartPoint[];
  @Input() title = 'Performance (30d)';

  @ViewChild('chartSvg') svgRef!: ElementRef<SVGElement>;

  width = 400;
  height = 160;
  pathD = '';
  areaD = '';

  ngOnInit(): void {
    this.buildChart();
  }

  ngAfterViewInit(): void {
    this.buildChart();
  }

  private buildChart(): void {
    if (!this.data?.length) return;

    const padding = 10;
    const values = this.data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = this.data.map((d, i) => {
      const x = padding + (i / (this.data.length - 1)) * (this.width - 2 * padding);
      const y = this.height - padding - ((d.value - min) / range) * (this.height - 2 * padding);
      return { x, y };
    });

    this.pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const last = points[points.length - 1];
    const first = points[0];
    this.areaD = `${this.pathD} L ${last.x} ${this.height} L ${first.x} ${this.height} Z`;
  }
}
