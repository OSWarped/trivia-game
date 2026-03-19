import '@/styles/globals.css';
import Layout from '@/components/Layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" />
        <link rel="android-chrome" href="/android-chrome-192x192.png" sizes="192x192" />
        <link rel="android-chrome" href="/android-chrome-512x512.png" sizes="512x512" />
      </head>
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
