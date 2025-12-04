import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrincipalScreenComponent } from './principal-screen.component';

describe('PrincipalScreenComponent', () => {
  let component: PrincipalScreenComponent;
  let fixture: ComponentFixture<PrincipalScreenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrincipalScreenComponent]
    });
    fixture = TestBed.createComponent(PrincipalScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
