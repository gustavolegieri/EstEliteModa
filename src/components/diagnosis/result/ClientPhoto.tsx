import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface ClientPhotoProps {
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ClientPhoto({ photoUrl, size = 'sm', className = '' }: ClientPhotoProps) {
  const sizeClasses = {
    sm: 'w-16 h-20',
    md: 'w-24 h-32',
    lg: 'w-32 h-44',
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border border-primary/20 shadow-sm ${sizeClasses[size]} ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Foto da cliente"
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-muted to-card flex flex-col items-center justify-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary/50" />
          </div>
          <span className="text-muted-foreground text-[8px] uppercase tracking-widest font-sans">Foto</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
    </motion.div>
  );
}
