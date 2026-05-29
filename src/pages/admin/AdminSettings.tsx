import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, CreditCard, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function validateStripePublishableKey(key: string): boolean {
  return !key || /^pk_(test|live)_[a-zA-Z0-9]+$/.test(key);
}

function validateStripeSecretKey(key: string): boolean {
  return !key || /^sk_(test|live)_[a-zA-Z0-9]+$/.test(key);
}

function validateWebhookSecret(key: string): boolean {
  return !key || /^whsec_[a-zA-Z0-9]+$/.test(key);
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(s => { map[s.key] = s.value; });
        setSettings(map);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getStringValue = (val: any) => {
    if (typeof val === 'string') return val.replace(/^"|"$/g, '');
    return val || '';
  };

  const handleSave = async () => {
    // Validate Stripe keys before saving
    const pk = getStringValue(settings.stripe_publishable_key);
    const sk = getStringValue(settings.stripe_secret_key);
    const wh = getStringValue(settings.stripe_webhook_secret);

    if (pk && !validateStripePublishableKey(pk)) {
      toast.error('Chave publicável inválida. Deve começar com pk_test_ ou pk_live_');
      return;
    }
    if (sk && !validateStripeSecretKey(sk)) {
      toast.error('Chave secreta inválida. Deve começar com sk_test_ ou sk_live_');
      return;
    }
    if (wh && !validateWebhookSecret(wh)) {
      toast.error('Webhook secret inválido. Deve começar com whsec_');
      return;
    }

    // Warn if mixing test/live keys
    if (pk && sk) {
      const pkIsTest = pk.startsWith('pk_test_');
      const skIsTest = sk.startsWith('sk_test_');
      if (pkIsTest !== skIsTest) {
        toast.error('As chaves devem ser do mesmo ambiente (ambas test ou ambas live)');
        return;
      }
    }

    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    toast.success('Configurações salvas!');
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-pulse text-primary">Carregando configurações...</div>;
  }

  const pk = getStringValue(settings.stripe_publishable_key);
  const sk = getStringValue(settings.stripe_secret_key);
  const wh = getStringValue(settings.stripe_webhook_secret);
  const stripeConfigured = !!pk && !!sk;
  const isTestMode = pk?.startsWith('pk_test_');

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-3xl text-gradient-gold">Configurações</h2>

      {/* Configurações Gerais */}
      <div className="glass-card rounded-xl p-6 space-y-6 max-w-xl">
        <h3 className="font-serif text-xl text-foreground">Geral</h3>

        <div>
          <Label>Nome do Site</Label>
          <Input
            value={getStringValue(settings.site_name)}
            onChange={e => updateSetting('site_name', `"${e.target.value}"`)}
          />
        </div>

        <div>
          <Label>E-mail de Contato</Label>
          <Input
            value={getStringValue(settings.contact_email)}
            onChange={e => updateSetting('contact_email', `"${e.target.value}"`)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={settings.demo_mode === true || settings.demo_mode === 'true'}
            onCheckedChange={v => updateSetting('demo_mode', v)}
          />
          <div>
            <Label>Modo Demonstração</Label>
            <p className="text-xs text-muted-foreground">Quando ativo, o botão "Assinar" mostra apenas uma demo sem cobrar.</p>
          </div>
        </div>
      </div>

      {/* Mercado Pago Checkout Pro */}
      <div className="glass-card rounded-xl p-6 space-y-4 max-w-xl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-xl text-foreground">Mercado Pago — Checkout Pro</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          API em <code className="text-xs">server.js</code> — tokens em <code className="text-xs">.env</code> (MP_ACCESS_TOKEN).
        </p>
        <p className="text-xs text-muted-foreground">
          Terminal 1: <code className="text-xs">npm run server</code> · Terminal 2: <code className="text-xs">npm run dev</code>
        </p>
      </div>

      {/* Configurações Stripe (legado) */}
      <div className="glass-card rounded-xl p-6 space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-serif text-xl text-foreground">Stripe (legado)</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Integração legada. Pagamentos ativos usam Mercado Pago.
        </p>

        <div>
          <Label>Chave Publicável (Publishable Key)</Label>
          <Input
            value={pk}
            onChange={e => updateSetting('stripe_publishable_key', `"${e.target.value}"`)}
            placeholder="pk_live_... ou pk_test_..."
          />
          {pk && !validateStripePublishableKey(pk) && (
            <p className="text-xs text-destructive mt-1">Formato inválido. Deve começar com pk_test_ ou pk_live_</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Começa com pk_live_ ou pk_test_</p>
        </div>

        <div>
          <Label>Chave Secreta (Secret Key)</Label>
          <div className="relative">
            <Input
              type={showSecretKey ? 'text' : 'password'}
              value={sk}
              onChange={e => updateSetting('stripe_secret_key', `"${e.target.value}"`)}
              placeholder="sk_live_... ou sk_test_..."
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {sk && !validateStripeSecretKey(sk) && (
            <p className="text-xs text-destructive mt-1">Formato inválido. Deve começar com sk_test_ ou sk_live_</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Começa com sk_live_ ou sk_test_. Usada apenas no servidor.</p>
        </div>

        <div>
          <Label>Webhook Signing Secret</Label>
          <div className="relative">
            <Input
              type={showWebhookSecret ? 'text' : 'password'}
              value={wh}
              onChange={e => updateSetting('stripe_webhook_secret', `"${e.target.value}"`)}
              placeholder="whsec_..."
            />
            <button
              type="button"
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {wh && !validateWebhookSecret(wh) && (
            <p className="text-xs text-destructive mt-1">Formato inválido. Deve começar com whsec_</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Encontrado no Stripe Dashboard → Webhooks → Signing secret. Obrigatório para segurança em produção.
          </p>
        </div>

        {/* Status indicators */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Status de Segurança</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${stripeConfigured ? 'bg-primary' : 'bg-muted-foreground'}`} />
            <span className={stripeConfigured ? 'text-primary' : 'text-muted-foreground'}>
              {stripeConfigured ? 'Chaves configuradas' : 'Chaves não configuradas'}
            </span>
            {stripeConfigured && isTestMode && (
              <span className="text-xs bg-accent/50 px-2 py-0.5 rounded-full">Modo Teste</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${wh ? 'bg-primary' : 'bg-destructive'}`} />
            <span className={wh ? 'text-primary' : 'text-destructive'}>
              {wh ? 'Webhook protegido por assinatura' : 'Webhook sem proteção — configure para produção'}
            </span>
          </div>
        </div>
      </div>

      <Button variant="premium" onClick={handleSave} disabled={saving} className="max-w-xl w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
      </Button>
    </div>
  );
}
