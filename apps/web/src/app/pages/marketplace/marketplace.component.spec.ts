import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MarketplaceComponent } from './marketplace.component';
import { ApiService } from '../../core/services/api.service';

describe('MarketplaceComponent', () => {
  let component: MarketplaceComponent;
  let fixture: ComponentFixture<MarketplaceComponent>;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiService = jasmine.createSpyObj('ApiService', ['getMarketplaceAgents']);
    apiService.getMarketplaceAgents.and.returnValue(
      of({ data: [], total: 0, page: 1, limit: 20 }),
    );

    await TestBed.configureTestingModule({
      imports: [MarketplaceComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load agents on init', () => {
    expect(apiService.getMarketplaceAgents).toHaveBeenCalled();
  });

  it('should reload agents when filters change', () => {
    apiService.getMarketplaceAgents.calls.reset();
    component.onFiltersChange({ protocol: 'PancakeSwap' });
    expect(apiService.getMarketplaceAgents).toHaveBeenCalledWith(
      jasmine.objectContaining({ protocol: 'PancakeSwap' }),
    );
  });
});
