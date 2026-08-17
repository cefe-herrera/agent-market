import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { AgentFiltersComponent } from './agent-filters.component';

describe('AgentFiltersComponent', () => {
  let component: AgentFiltersComponent;
  let fixture: ComponentFixture<AgentFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentFiltersComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filters on form change', () => {
    const spy = spyOn(component.filtersChange, 'emit');
    component.form.patchValue({ protocol: 'Venus' });
    expect(spy).toHaveBeenCalled();
  });
});
