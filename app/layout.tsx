import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "VÉRTICE — O impossível tem forma.",
  description:
    "Um ateliê de esculturas digitais paramétricas. Explore a matéria em movimento, crie sua forma, guarde uma peça e compartilhe seu gesto.",
  metadataBase: new URL(
    "https://vertice-studio-gustapaz.starrylinen.chatgpt.site",
  ),
  alternates: { canonical: "/" },
  openGraph: {
    title: "VÉRTICE — Matéria em movimento",
    description: "Uma linha. Nenhum ponto final. Crie sua escultura digital.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/media/social.png", width: 1200, height: 630 }],
  },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
