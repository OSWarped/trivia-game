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
    
  </head>
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
