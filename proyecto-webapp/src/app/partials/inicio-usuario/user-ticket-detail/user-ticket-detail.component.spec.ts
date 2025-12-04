import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserTicketDetailComponent } from './user-ticket-detail.component';

describe('UserTicketDetailComponent', () => {
  let component: UserTicketDetailComponent;
  let fixture: ComponentFixture<UserTicketDetailComponent>;

  beforeEach(async) {
    await TestBed.configureTestingModule({
      declarations: [UserTicketDetailComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserTicketDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
