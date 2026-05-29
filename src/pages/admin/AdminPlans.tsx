import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyPlan: Omit<Plan, 'id'> = {
    name: '',
    description: '',
    price_cents: 9700,
    currency: 'BRL',
    interval: 'monthly',
    features: [],
    is_active: true,
    is_popular: false,
    sort_order: 0,
  };

  const [form, setForm] = useState<Omit<Plan, 'id'> & { id?: string }>(emptyPlan);
  const [featuresText, setFeaturesText] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('sort_order');
    if (data) {
      setPlans(data.map(p => ({ ...p, features: (p.features as string[]) || [] })));
    }
    setLoading(false);
  };

  const openNewPlan = () => {
    setForm(emptyPlan);
    setFeaturesText('');
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setForm(plan);
    setFeaturesText(plan.features.join('\n'));
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const features = featuresText.split('\n').filter(f => f.trim());
    const payload = {
      name: form.name,
      description: form.description,
      price_cents: form.price_cents,
      currency: form.currency,
      interval: form.interval,
      features: features as unknown as string,
      is_active: form.is_active,
      is_popular: form.is_popular,
      sort_order: form.sort_order,
      updated_at: new Date().toISOString(),
    };

    if (editingPlan) {
      const { error } = await supabase.from('plans').update(payload).eq('id', editingPlan.id);
      if (error) {
        toast.error('Erro ao atualizar plano');
      } else {
        toast.success('Plano atualizado!');
      }
    } else {
      const { error } = await supabase.from('plans').insert(payload);
      if (error) {
        toast.error('Erro ao criar plano');
      } else {
        toast.success('Plano criado!');
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir plano');
    } else {
      toast.success('Plano excluído');
      fetchPlans();
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  if (loading) {
    return <div className="animate-pulse text-primary">Carregando planos...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-3xl text-gradient-gold">Planos</h2>
        <Button variant="premium" onClick={openNewPlan}>
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="glass-card rounded-xl p-6 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-xl">{plan.name}</h3>
                {plan.is_popular && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Popular</span>
                )}
                {!plan.is_active && (
                  <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Inativo</span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {formatPrice(plan.price_cents)}/{plan.interval === 'monthly' ? 'mês' : 'ano'} · {plan.features.length} recursos
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => openEditPlan(plan)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleDelete(plan.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome do plano</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Plano Premium" />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (centavos)</Label>
                <Input type="number" value={form.price_cents} onChange={e => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground mt-1">{formatPrice(form.price_cents)}</p>
              </div>
              <div>
                <Label>Intervalo</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.interval}
                  onChange={e => setForm({ ...form, interval: e.target.value })}
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Recursos (um por linha)</Label>
              <Textarea
                rows={6}
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                placeholder="Diagnósticos ilimitados&#10;Análise corporal completa&#10;..."
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_popular} onCheckedChange={v => setForm({ ...form, is_popular: v })} />
                <Label>Popular</Label>
              </div>
            </div>

            <div>
              <Label>Ordem de exibição</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>

            <Button variant="premium" className="w-full" onClick={handleSave} disabled={saving || !form.name}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Plano'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
