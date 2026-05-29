import { useMemo } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface StyleRadarProps {
  scores?: Record<string, number> | null;
  preferences?: string[];
}

const styleLabels: Record<string, string> = {
  classic: 'Clássico',
  romantic: 'Romântico',
  modern: 'Moderno',
  bold: 'Ousado',
  bohemian: 'Boho',
  elegant: 'Elegante',
};

const allStyles = ['Clássico', 'Romântico', 'Moderno', 'Ousado', 'Boho', 'Elegante'];

export function StyleRadar({ scores, preferences }: StyleRadarProps) {
  const data = useMemo(() => {
    if (scores && Object.keys(scores).length > 0) {
      return allStyles.map(style => ({
        style,
        value: typeof scores[style] === 'number' ? scores[style] : 20,
      }));
    }

    if (preferences && preferences.length > 0) {
      return allStyles.map(style => {
        const key = Object.entries(styleLabels).find(([, v]) => v === style)?.[0];
        return {
          style,
          value: key && preferences.includes(key) ? 85 : 20,
        };
      });
    }

    return allStyles.map(style => ({ style, value: 50 }));
  }, [scores, preferences]);

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border p-6 md:p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
    >
      <h3 className="text-xl font-serif font-bold text-primary mb-6 text-center">Radar de Estilo</h3>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="style"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontFamily: 'sans-serif' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Estilo"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
