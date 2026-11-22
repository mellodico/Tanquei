import { useEffect, useRef, useState, type ReactNode } from "react";

interface WhenVisibleProps {
  id?: string;
  children: ReactNode;
  /** Ocupa o espaço enquanto o conteúdo não é carregado, para a página não "pular" */
  placeholder: ReactNode;
  /** Começa a carregar um pouco antes de entrar na tela */
  rootMargin?: string;
}

/** Só renderiza `children` quando o bloco se aproxima da área visível. */
export function WhenVisible({ id, children, placeholder, rootMargin = "300px" }: WhenVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div id={id} ref={ref}>
      {visible ? children : placeholder}
    </div>
  );
}
