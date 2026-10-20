import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirige automáticamente a /login si no hay ruta raíz definida
  redirect('/login');
}
