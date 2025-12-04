import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioAgenteComponent } from './inicio-agente.component';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('InicioAgenteComponent', () => {
  let component: InicioAgenteComponent;
  let fixture: ComponentFixture<InicioAgenteComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InicioAgenteComponent],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InicioAgenteComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle menu state on toggleMenu', () => {
    expect(component.isMenuOpen).toBeFalse();
    component.toggleMenu();
    expect(component.isMenuOpen).toBeTrue();
    component.toggleMenu();
    expect(component.isMenuOpen).toBeFalse();
  });

  it('should navigate to correct section on navigateToSection', () => {
    component.navigateToSection('tickets-asignados');
    expect(router.navigate).toHaveBeenCalledWith(['/inicio-agente/tickets-asignados']);

    component.navigateToSection('historial-tickets');
    expect(router.navigate).toHaveBeenCalledWith(['/inicio-agente/historial-tickets']);

    component.navigateToSection('settings');
    expect(router.navigate).toHaveBeenCalledWith(['/inicio-agente/settings']);
  });

  it('should update activeSection on navigateToSection', () => {
    component.navigateToSection('tickets-asignados');
    expect(component.activeSection).toBe('tickets-asignados');

    component.navigateToSection('historial-tickets');
    expect(component.activeSection).toBe('historial-tickets');
  });

  it('should trigger navigateTo with correct path', () => {
    component.navigateTo('Chat');
    expect(router.navigate).toHaveBeenCalledWith(['Chat']);
  });

  it('should render welcome message', () => {
    const welcomeElement = fixture.debugElement.query(By.css('.welcome'));
    expect(welcomeElement).toBeTruthy();
    expect(welcomeElement.nativeElement.textContent).toContain('Bienvenido, Agente');
  });
});