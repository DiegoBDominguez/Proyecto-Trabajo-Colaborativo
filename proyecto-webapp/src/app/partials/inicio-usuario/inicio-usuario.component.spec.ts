import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { InicioUsuarioComponent } from './inicio-usuario.component';
import { By } from '@angular/platform-browser';

describe('InicioUsuarioComponent', () => {
  let component: InicioUsuarioComponent;
  let fixture: ComponentFixture<InicioUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [InicioUsuarioComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería mostrar "Bienvenido, Usuario" inicialmente', () => {
    const welcome = fixture.debugElement.query(By.css('.welcome')).nativeElement;
    expect(welcome.textContent).toContain('Bienvenido, Usuario');
  });

  it('debería cambiar el título al seleccionar una sección', () => {
    component.cambiarTitulo('Mis Tickets');
    fixture.detectChanges();
    const welcome = fixture.debugElement.query(By.css('.welcome')).nativeElement;
    expect(welcome.textContent).toContain('Mis Tickets');
  });

  it('debería alternar el estado del menú', () => {
    const estadoInicial = component.isMenuOpen;
    component.toggleMenu();
    expect(component.isMenuOpen).toBe(!estadoInicial);
  });
});

