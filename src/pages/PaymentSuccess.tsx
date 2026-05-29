import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { activateSubscriptionFromPayment } from '@/lib/activateSubscription';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(8);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const collectionStatus = searchParams.get('collection_status');
    const status = searchParams.get('status');
    const externalRef = searchParams.get('external_reference');
    const isApproved =
      collectionStatus === 'approved' ||
      status === 'approved' ||
      (!collectionStatus && !status && !searchParams.get('payment'));

    (async () => {
      if (!externalRef) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      if (!isApproved && collectionStatus !== 'pending' && status !== 'pending') {
        setErrorMsg('Pagamento não confirmado. Tente novamente ou entre em contato.');
        setLoading(false);
        return;
      }

      const result = await activateSubscriptionFromPayment(externalRef);
      if (result.ok) {
        setSuccess(true);
      } else {
        setErrorMsg(result.error || 'Não foi possível ativar sua assinatura');
      }
      setLoading(false);
    })();
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/account');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, loading]);

  return (
    <Layout>
      <section className="min-h-[80vh] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center max-w-lg mx-auto px-4"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8">
            {loading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : success ? (
              <CheckCircle className="w-10 h-10 text-primary" />
            ) : (
              <AlertCircle className="w-10 h-10 text-destructive" />
            )}
          </div>

          <h1 className="font-serif text-4xl md:text-5xl text-gradient-gold mb-4">
            {loading ? 'Confirmando pagamento...' : success ? 'Pagamento confirmado!' : 'Atenção'}
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            {loading
              ? 'Estamos liberando seu acesso.'
              : success
                ? 'Sua assinatura foi ativada com sucesso.'
                : errorMsg}
          </p>

          {success && !loading && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Acesso completo liberado</span>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              <Button variant="premium" size="xl" className="w-full max-w-xs mx-auto" onClick={() => navigate('/account')}>
                <ArrowRight className="h-5 w-5" />
                Ir para o Painel
              </Button>
              {success && (
                <p className="text-xs text-muted-foreground">
                  Redirecionando em {countdown}s...
                </p>
              )}
            </div>
          )}
        </motion.div>
      </section>
    </Layout>
  );
}
