import logo from './assets/logo.svg'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-md border-b border-border h-25">
      <div className="container mx-auto px-4 h-full max-w-7xl">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3 relative h-full">
            <div className='w-1'></div>
            <a href="#">
              <img 
                src={logo} 
                alt="Tanquei" 
                className="h-28 w-auto filter drop-shadow-sm
                transition-all duration-300 ease-in-out cursor-pointer
                hover:scale-105"
              />
            </a>
          </div>
            
          
          <nav className="hidden md:flex items-center gap-6" style={{ color: 'var(--tanquei-purple)' }}>
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
        </div>
      </div>
    </header>
  );
}