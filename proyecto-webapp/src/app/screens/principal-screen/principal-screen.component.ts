import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-principal-screen',
  templateUrl: './principal-screen.component.html',
  styleUrls: ['./principal-screen.component.scss']
})
export class PrincipalScreenComponent implements OnInit, OnDestroy {
  public countdown = 7;
  private timerHandle: any;

  constructor(private router: Router) { }

  ngOnInit(): void {
    // start countdown visible in template (Angular binding)
    this.timerHandle = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        clearInterval(this.timerHandle);
        this.router.navigate(['/login-screen']);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerHandle) { clearInterval(this.timerHandle); }
  }

  navegarA(ruta: string) {
    if (this.timerHandle) { clearInterval(this.timerHandle); }
    this.router.navigate([`/${ruta}`]);
  }
}
