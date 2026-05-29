import { motion } from 'framer-motion';
import { Ruler, Weight, Shirt, Footprints } from 'lucide-react';

interface BodyCharacteristicsProps {
  heightCm?: number | null;
  weightKg?: number | null;
  topSize?: string | null;
  bottomSize?: string | null;
  shoeSize?: string | null;
  bodyNotes?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  skinTone?: string | null;
}

function StatCard({ icon: Icon, label, value, delay = 0 }: {
  icon: React.ElementType; label: string; value: string; delay?: number;
}) {
  return (
    <motion.div
      className="bg-gradient-to-br from-primary/10 to-card rounded-2xl border border-primary/15 p-6 flex flex-col items-center text-center hover:border-primary/30 transition-colors"
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <p className="text-foreground font-serif text-2xl font-bold">{value}</p>
      <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1 font-sans">{label}</p>
    </motion.div>
  );
}

export function BodyCharacteristicsSection(props: BodyCharacteristicsProps) {
  const { heightCm, weightKg, topSize, bottomSize, shoeSize, bodyNotes, hairColor, eyeColor, skinTone } = props;

  const hasBasicStats = heightCm || weightKg || topSize || bottomSize || shoeSize;
  const hasColoring = hairColor || eyeColor || skinTone;

  if (!hasBasicStats && !hasColoring && !bodyNotes) return null;

  return (
    <section className="space-y-8">
      {/* Stats grid */}
      {hasBasicStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {heightCm && <StatCard icon={Ruler} label="Altura" value={`${heightCm}cm`} delay={0} />}
          {weightKg && <StatCard icon={Weight} label="Peso" value={`${weightKg}kg`} delay={0.05} />}
          {topSize && <StatCard icon={Shirt} label="Parte Superior" value={topSize} delay={0.1} />}
          {bottomSize && <StatCard icon={Shirt} label="Parte Inferior" value={bottomSize} delay={0.15} />}
          {shoeSize && <StatCard icon={Footprints} label="Calçado" value={shoeSize} delay={0.2} />}
        </div>
      )}

      {/* Coloring info */}
      {hasColoring && (
        <motion.div
          className="bg-muted/30 rounded-2xl border border-border p-6"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="text-lg font-serif font-bold text-primary mb-4">Coloração Natural</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {hairColor && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Cabelo</p>
                  <p className="text-foreground font-medium text-sm">{hairColor}</p>
                </div>
              </div>
            )}
            {eyeColor && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Olhos</p>
                  <p className="text-foreground font-medium text-sm">{eyeColor}</p>
                </div>
              </div>
            )}
            {skinTone && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Pele</p>
                  <p className="text-foreground font-medium text-sm">{skinTone}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Body notes */}
      {bodyNotes && (
        <motion.div
          className="relative bg-card rounded-2xl border border-border p-6 overflow-hidden"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary/50 to-transparent" />
          <div className="pl-4">
            <h4 className="text-sm font-serif font-bold text-primary mb-2">Observações Corporais</h4>
            <p className="text-foreground/80 text-sm leading-relaxed">{bodyNotes}</p>
          </div>
        </motion.div>
      )}
    </section>
  );
}
