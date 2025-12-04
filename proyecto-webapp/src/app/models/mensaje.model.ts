export interface Attachment {
  id: number;
  nombre: string;
  archivo: string; // URL
  tipo: string;
  tamano: number;
  fecha_subida: string;
}

export interface Mensaje {
  id: number;
  ticket: number;
  usuario: string;
  usuarioFullName?: string;
  texto: string;
  esAgente: boolean;
  fecha: string; // ISO string
  attachments?: Attachment[];
}
