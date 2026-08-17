import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MarketplaceComponent } from './pages/marketplace/marketplace.component';
import { AgentDetailComponent } from './pages/agent-detail/agent-detail.component';
import { CompareComponent } from './pages/compare/compare.component';
import { MyAgentsComponent } from './pages/my-agents/my-agents.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'agents', component: MarketplaceComponent },
  {
    path: 'agents/rebalancing',
    component: MarketplaceComponent,
    data: { categorySlug: 'rebalancing' },
  },
  {
    path: 'agents/grid-trading',
    component: MarketplaceComponent,
    data: { categorySlug: 'grid-trading' },
  },
  {
    path: 'agents/yield',
    component: MarketplaceComponent,
    data: { categorySlug: 'yield' },
  },
  {
    path: 'agents/health-factor',
    component: MarketplaceComponent,
    data: { categorySlug: 'health-factor' },
  },
  { path: 'agents/:slug', component: AgentDetailComponent },
  { path: 'compare', component: CompareComponent },
  { path: 'my-agents', component: MyAgentsComponent },
  { path: '**', redirectTo: '' },
];
