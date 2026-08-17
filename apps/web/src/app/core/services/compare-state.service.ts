import { Injectable, signal, computed } from '@angular/core';
import { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';

@Injectable({ providedIn: 'root' })
export class CompareStateService {
  private readonly selectedAgents = signal<MarketplaceAgentDto[]>([]);

  readonly agents = this.selectedAgents.asReadonly();
  readonly count = computed(() => this.selectedAgents().length);
  readonly canAdd = computed(() => this.selectedAgents().length < 3);
  readonly ids = computed(() => this.selectedAgents().map((a) => a.id));

  toggle(agent: MarketplaceAgentDto): void {
    const current = this.selectedAgents();
    const exists = current.find((a) => a.id === agent.id);
    if (exists) {
      this.selectedAgents.set(current.filter((a) => a.id !== agent.id));
    } else if (current.length < 3) {
      this.selectedAgents.set([...current, agent]);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedAgents().some((a) => a.id === id);
  }

  clear(): void {
    this.selectedAgents.set([]);
  }
}
