import { Moon, Sun } from 'lucide-react'
import logo from './assets/logo.svg'
import logoDark from './assets/logo-dark.svg'
import type { Theme } from '../../hooks/useTheme'

const logoClass = 'h-14 md:h-[4.5rem] w-auto drop-shadow-sm'

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const isDark = theme === 'dark';
  const label = isDark ? 'Usar modo claro' : 'Usar modo noturno';

  return (
    <header className="sticky top-0 z-50 bg-card shadow-md border-b border-border h-16 md:h-20">
      <div className="container mx-auto px-4 h-full max-w-7xl">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center h-full">
            <a href="#" aria-label="Tanquei, voltar ao início" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {/* As duas versões são trocadas por CSS, sem esperar o JavaScript */}
              <img src={logo} alt="Tanquei" className={`${logoClass} dark:hidden`} />
              <img src={logoDark} alt="Tanquei" className={`${logoClass} hidden dark:block`} />
            </a>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6" style={{ color: 'var(--heading)' }}>
              <a href="#" className="hover:text-[#FFC90E] transition-colors font-medium">
                Início
              </a>
              <a href="#calculadoras" className="hover:text-[#FFC90E] transition-colors font-medium">
                Calculadoras
              </a>
              <a href="#graficos" className="hover:text-[#FFC90E] transition-colors font-medium">
                Gráficos
              </a>
            </nav>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={label}
              title={label}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-heading transition-colors hover:border-[#FFC90E] hover:text-[#FFC90E] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
