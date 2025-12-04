export interface Notification {
  id: string; // UUID
  userId: number; // ID del usuario que recibe la notificación (0 reserved - avoid using as global broadcast)
  // Optional: a role target (if set, notification is shown to users with that role)
  targetRole?: 'admin' | 'agente' | 'usuario';
  type: 'ticket_assigned' | 'ticket_response' | 'ticket_closed' | 'user_registered';
  titulo: string;
  mensaje: string;
  icon: string; // icono Font Awesome (ej: 'fa-ticket', 'fa-envelope', etc)
  data?: {
    ticketId?: number;
    userId?: number;
    userName?: string;
    [key: string]: any;
  };
  leida: boolean;
  fecha: Date;
}
