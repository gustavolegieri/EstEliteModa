import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface BodyBalanceChartProps {
  bodyType?: string;
  balanceScore?: Record<string, number> | null;
}

function getBalanceFromBodyType(bodyType?: string): { name: string; value: number }[] {
  const t = (bodyType || '').toLowerCase();
  if (t.includes('pera') || t.includes('triângulo') && !t.includes('invertido')) {
    return [
      { name: 'Ombros', value: 55 },
      { name: 'Cintura', value: 65 },
      { name: 'Quadril', value: 90 },
    ];
  }
  if (t.includes('invertido')) {
    return [
      { name: 'Ombros', value: 90 },
      { name: 'Cintura', value: 60 },
      { name: 'Quadril', value: 55 },
    ];
  }
  if (t.includes('ampulheta')) {
    return [
      { name: 'Ombros', value: 85 },
      { name: 'Cintura', value: 55 },
      { name: 'Quadril', value: 85 },
    ];
  }
  if (t.includes('oval')) {
    return [
      { name: 'Ombros', value: 70 },
      { name: 'Cintura', value: 90 },
      { name: 'Quadril', value: 75 },
    ];
  }
  // rectangle / default
  return [
    { name: 'Ombros', value: 75 },
    { name: 'Cintura', value: 72 },
    { name: 'Quadril', value: 75 },
  ];
}

export function BodyBalanceChart({ bodyType, balanceScore }: BodyBalanceChartProps) {
  const data = useMemo(() => {
    if (balanceScore && Object.keys(balanceScore).length > 0) {
      return Object.entries(balanceScore).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: typeof value === 'number' ? value : 50,
      }));
    }
    return getBalanceFromBodyType(bodyType);
  }, [bodyType, balanceScore]);

  const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--primary))'];

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border p-6 md:p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
    >
      <h3 className="text-xl font-serif font-bold text-primary mb-2 text-center">Equilíbrio Corporal</h3>
      <p className="text-muted-foreground text-xs text-center mb-6 font-sans">Proporção visual estimada</p>
      <div className="w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontFamily: 'sans-serif' }}
              width={70}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
