import { Button } from '@/components/ui/button';
import { Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div
      className="glass-card rounded-2xl py-16 px-8 text-center"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        {icon || <Sparkles className="h-10 w-10 text-primary/60" />}
      </div>
      <h3 className="font-serif text-2xl text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="premium" size="lg" onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
