import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroAgentesComponent } from './registro-agentes.component';

describe('RegistroAgentesComponent', () => {
  let component: RegistroAgentesComponent;
  let fixture: ComponentFixture<RegistroAgentesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RegistroAgentesComponent]
    });
    fixture = TestBed.createComponent(RegistroAgentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
