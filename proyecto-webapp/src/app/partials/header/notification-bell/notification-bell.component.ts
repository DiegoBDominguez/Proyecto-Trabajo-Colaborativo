import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { Notification } from '../../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount: number = 0;
  showDropdown: boolean = false;
  private subs: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const notifSub = this.notificationService.getNotifications().subscribe(
      notifs => {
        this.notifications = notifs;
      }
    );

    const countSub = this.notificationService.getUnreadCount().subscribe(
      count => {
        this.unreadCount = count;
      }
    );

    this.subs.push(notifSub, countSub);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown() {
    this.showDropdown = false;
  }

  markAsRead(notif: Notification, event?: Event) {
    if (event) event.stopPropagation();
    
    if (!notif.leida) {
      this.notificationService.markAsRead(notif.id);
    }

    // Navegar si tiene ticketId
    if (notif.data?.ticketId) {
      this.router.navigate(['/inicio-usuario/ticket', notif.data.ticketId]);
      this.closeDropdown();
    }
  }

  deleteNotification(notifId: string, event: Event) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notifId);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  clearAll() {
    this.notificationService.clearAll();
  }

  getNotificationTypeColor(type: string): string {
    switch (type) {
      case 'ticket_assigned':
        return '#5a67d8'; // Púrpura
      case 'ticket_response':
        return '#0a7a18'; // Verde
      case 'ticket_closed':
        return '#1e40af'; // Azul
      case 'user_registered':
        return '#f57c00'; // Naranja
      default:
        return '#6c757d';
    }
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString();
  }
}
