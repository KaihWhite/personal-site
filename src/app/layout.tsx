import type { Metadata } from 'next';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Kaih White',
  description: 'Personal site of Kaih White — engineer, tinkerer, graphics enthusiast.',
  icons: { icon: '/THIS_IS_IT.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
