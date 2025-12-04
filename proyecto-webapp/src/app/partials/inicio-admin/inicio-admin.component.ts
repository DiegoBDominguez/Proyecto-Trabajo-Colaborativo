import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inicio-admin',
  templateUrl: './inicio-admin.component.html',
  styleUrls: ['./inicio-admin.component.scss']
})
export class InicioAdminComponent {
  isMenuOpen = false;
  activeSection: string = ''; // Para rastrear la sección activa

  constructor(private authService: AuthService) {}

  navigateTo(route: string) {
    console.log(`Navegando a: ${route}`);
    // Mantendrá la lógica actual para los botones flotantes
  }

  navigateToSection(sectionId: string) {
    console.log(`Navegando a sección: ${sectionId}`);
    this.activeSection = sectionId; // Actualiza la sección activa
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('active-section');
      // Oculta otras secciones
      document.querySelectorAll('.section').forEach((sec) => {
        if (sec.id !== sectionId) sec.classList.remove('active-section');
      });
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}