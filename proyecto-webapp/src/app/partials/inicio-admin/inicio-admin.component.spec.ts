import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioAdminComponent } from './inicio-admin.component';

describe('InicioAdminComponent', () => {
  let component: InicioAdminComponent;
  let fixture: ComponentFixture<InicioAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InicioAdminComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InicioAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle menu state', () => {
    expect(component.isMenuOpen).toBeFalse();
    component.toggleMenu();
    expect(component.isMenuOpen).toBeTrue();
    component.toggleMenu();
    expect(component.isMenuOpen).toBeFalse();
  });

  it('should navigate to section', () => {
    spyOn(console, 'log');
    component.navigateToSection('gestion-usuarios');
    expect(console.log).toHaveBeenCalledWith('Navegando a sección: gestion-usuarios');
    expect(component.activeSection).toBe('gestion-usuarios');
  });

  it('should navigate to route', () => {
    spyOn(console, 'log');
    component.navigateTo('Chat');
    expect(console.log).toHaveBeenCalledWith('Navegando a: Chat');
  });

  it('should initialize with active section', () => {
    expect(component.activeSection).toBe('gestion-usuarios');
  });
});