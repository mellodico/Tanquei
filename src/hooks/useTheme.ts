import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Mesma chave lida pelo script do index.html, que aplica o tema antes da primeira pintura. */
const STORAGE_KEY = "tanquei:tema";

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Tema da página. Começa pelo que o index.html já aplicou (escolha salva ou tema do sistema).
 * Enquanto o usuário não escolher, acompanha as mudanças do tema do sistema.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    // Cor da barra do navegador no celular: igual ao cabeçalho, mesmo quando o tema
    // escolhido é diferente do tema do sistema.
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = theme === "dark" ? "#1d1626" : "#ffffff";
    });
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!storedTheme()) setTheme(e.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Armazenamento indisponível: o tema vale só para esta visita
    }
    setTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}
