export interface Ticket {
  id: number;
  titulo?: string | null;
  descripcion: string;
  categoria: string;
  estado: 'Nuevo' | 'Enviado' | 'Abierto' | 'Respondido' | 'En Proceso' | 'Cerrado';
  prioridad: 'Baja' | 'Media' | 'Alta';
  responsable: string;
  fecha: string; // ISO string
  archivoName?: string | null;
  archivoDataUrl?: string | null;

  // nuevos del backend
  folio?: string;
  folio_usuario?: number;
  folio_agente?: number;
  usuario_email?: string;
  usuario_nombre?: string;
  usuario_id?: number;
  agente_id?: number; // ID del agente asignado para notificaciones dirigidas
}
