import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.scss']
})
export class LoadingSkeletonComponent {
  @Input() type: 'text' | 'title' | 'card' | 'circle' | 'custom' = 'text';
  @Input() height: string = 'auto';
  @Input() width: string = '100%';
  @Input() count: number = 1;
  @Input() rounded: boolean = false;

  get skeletonArray(): number[] {
    return Array(this.count).fill(0);
  }
}
