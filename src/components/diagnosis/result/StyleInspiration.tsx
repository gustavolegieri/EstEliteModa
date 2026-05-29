import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

interface StyleInspirationProps {
  style?: string;
  colorSeason?: string;
}

const placeholderGradients = [
  'from-primary/15 via-primary/5 to-card',
  'from-card via-primary/8 to-primary/10',
  'from-primary/10 via-card to-primary/12',
  'from-card via-primary/5 to-card',
  'from-primary/12 via-card to-primary/8',
  'from-primary/5 via-primary/10 to-card',
];

const labels = [
  'Trabalho',
  'Casual Chic',
  'Romântico',
  'Profissional',
  'Dia a dia',
  'Eventos',
];

const emojis = ['💼', '✨', '🌸', '👔', '☀️', '🎀'];

export function StyleInspiration({ style, colorSeason }: StyleInspirationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-lg font-serif font-bold text-primary mb-6 flex items-center gap-3">
        <Eye className="w-6 h-6" />
        Inspirações de Estilo
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {placeholderGradients.map((gradient, i) => (
          <div
            key={i}
            className={`relative aspect-[4/5] rounded-xl border border-border overflow-hidden bg-gradient-to-br ${gradient} group hover:border-primary/30 hover:shadow-[var(--shadow-gold)] transition-all duration-300`}
          >
            <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <div className="text-center">
                <span className="text-3xl mb-2 block">{emojis[i]}</span>
                <p className="text-primary/50 text-xs font-sans uppercase tracking-widest">{labels[i]}</p>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/90 to-transparent">
              <p className="text-foreground/70 text-xs font-sans font-medium">{labels[i]}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs mt-4 text-center italic">
        Referências baseadas no seu perfil • {style || 'Estilo personalizado'}
      </p>
    </motion.div>
  );
}
