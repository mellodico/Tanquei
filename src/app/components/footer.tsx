import { Github } from "lucide-react";

const LINKS = [
  { href: "#", label: "Início" },
  { href: "#calculadoras", label: "Calculadoras" },
  { href: "#graficos", label: "Gráficos" },
];

export function Footer() {
  return (
    <footer className="mt-12 text-white/80" style={{ backgroundColor: "var(--tanquei-purple)" }}>
      <div className="container mx-auto px-4 max-w-7xl py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-2xl font-bold text-white">
              Tanq<span style={{ color: "var(--tanquei-yellow)" }}>uei</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Preços de combustíveis em Alagoas para encontrar o posto mais barato perto de você.
            </p>
          </div>

          <nav aria-label="Rodapé">
            <p className="text-sm font-semibold text-white mb-3">Navegação</p>
            <ul className="space-y-2 text-sm">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-[#FFC90E] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-white mb-3">Sobre os dados</p>
            <p>
              Preços da API{" "}
              <a
                href="https://economizaalagoas.sefaz.al.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#FFC90E] transition-colors"
              >
                Economiza Alagoas
              </a>{" "}
              (SEFAZ-AL), a partir das vendas registradas pelos postos. Os valores podem mudar a
              qualquer momento: confira o preço na bomba antes de abastecer.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/15 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs">
          <p>© {new Date().getFullYear()} Tanquei. Código aberto sob a licença MIT.</p>
          <a
            href="https://github.com/mellodico/Tanquei"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#FFC90E] transition-colors"
          >
            <Github className="h-4 w-4" />
            Código no GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
