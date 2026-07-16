import type { Moneda } from './lib/format';
import type { Categoria } from './lib/categorias';

export type Usuario = {
  id: string;
  correo: string;
  nombre: string;
  codigo_unico: string;
  moneda_preferida: Moneda;
  limite_balance: string | null; // NUMERIC llega como texto; null = sin alerta
};

export type Pareja = { id: string; nombre: string; correo: string };

export type EstadoVinculo =
  | { estado: 'ninguno' }
  | { estado: 'pendiente_enviada'; pareja: Pareja; vinculoId: string }
  | { estado: 'pendiente_recibida'; pareja: Pareja; vinculoId: string }
  | {
      estado: 'activo';
      pareja: Pareja;
      vinculoId: string;
      limite_comun: string | null;
      limite_pareja: string | null;
    };

export type Subcategoria = {
  id: string;
  categoria: Categoria;
  tipo: 'fijo' | 'variable' | null;
  nombre: string;
};

export type Movimiento = {
  id: string;
  fecha: string; // 'YYYY-MM-DD'
  monto: string; // NUMERIC llega como texto desde la API
  moneda: Moneda;
  categoria: Categoria;
  tipo: 'fijo' | 'variable' | null;
  subcategoria_id: string | null;
  subcategoria_nombre: string | null;
  descripcion: string;
  usuario_id: string;
  usuario_nombre: string;
};
