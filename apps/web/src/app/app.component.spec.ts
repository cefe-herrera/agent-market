import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { I18nService } from './core/i18n/i18n.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the localised navigation', () => {
    const i18n = TestBed.inject(I18nService);
    const fixture = TestBed.createComponent(AppComponent);

    i18n.setLang('en');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My Agents');

    i18n.setLang('es');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mis Agentes');
  });
});
