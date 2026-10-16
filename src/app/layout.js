import './globals.css';

export const metadata = {
  title: 'Flor de Loto 3D 🪷',
  description: 'Experiencia visual 3D interactiva de flor de loto sagrada, estanque zen, peces koi y naturaleza animada.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
