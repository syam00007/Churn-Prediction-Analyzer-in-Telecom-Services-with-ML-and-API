import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Churn Prediction Analyzer",
  description: "Predict customer churn with ease.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/PSNlogo.png"/>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
