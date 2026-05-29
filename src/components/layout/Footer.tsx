import { Logo } from '@/components/Logo';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[hsl(0,0%,5%)] border-t border-border/50">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <Link to="/">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Descubra sua essência através da nossa análise personalizada de imagem com inteligência artificial.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-5">Navegação</h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Início' },
                { to: '/how-it-works', label: 'Como Funciona' },
                { to: '/pricing', label: 'Preços' },
                { to: '/faq', label: 'FAQ' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-5">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-5">Contato</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contato@estelite.com.br"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  contato@estelite.com.br
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} EST ELITE. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Feito com <Heart className="h-3 w-3 text-primary fill-primary" /> e IA
          </p>
        </div>
      </div>
    </footer>
  );
}
