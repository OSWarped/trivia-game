//import "./globals.css";
import { AuthProvider } from "../context/AuthContext"; // Relative path
import Header from "@/components/Header";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
 

  try {
    
  } catch (error) {
    console.error("Failed to get user info:", error);
  }

  return (
    <AuthProvider>
      <html lang="en">
        <body>
          <Header />
          <main>{children}</main>
        </body>
      </html>
    </AuthProvider>
  );
}
