import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Image Archive — A / B', description: 'A personal image archive. Explore collections, chapters, and moments.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
