import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  variant?: 'default' | 'enhanced' | 'bright-blue' | 'white-letters' | 'white-blue-glow';
}

const Logo = ({ className = "", variant = 'white-blue-glow' }: LogoProps) => {
  return (
    <Link 
      to="/" 
      className={`flex items-center transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg ${className}`}
    >
      {/* Try to show image logo first */}
      <img 
        src="/logo.png" 
        alt="Super Mock Logo" 
        className={`h-8 w-auto object-contain ${
          variant === 'enhanced' ? 'logo-enhanced' : 
          variant === 'bright-blue' ? 'logo-bright-blue' : 
          variant === 'white-letters' ? 'logo-white-letters' :
          variant === 'white-blue-glow' ? 'logo-white-blue-glow' :
          ''
        }`}
        onError={(e) => {
          console.error('Logo image failed to load: /logo.png');
          // Hide image and show text fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.text-logo-fallback')) {
            const textLogo = document.createElement('div');
            textLogo.className = 'text-logo-fallback text-xl font-bold gradient-primary bg-clip-text text-transparent';
            textLogo.textContent = 'Super Mock';
            parent.appendChild(textLogo);
          }
        }}
      />
    </Link>
  );
};

export default Logo;
