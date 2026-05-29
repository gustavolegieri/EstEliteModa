import { Layout } from '@/components/layout/Layout';

export default function Terms() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-serif text-4xl md:text-5xl text-gradient-gold mb-8">Termos de Uso</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar a plataforma EST ELITE, você concorda com estes Termos de Uso. Se não concordar, por favor, não utilize nossos serviços.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">2. Descrição do Serviço</h2>
          <p>A EST ELITE oferece um serviço de diagnóstico de imagem pessoal utilizando inteligência artificial. O serviço analisa fotos e informações fornecidas pela usuária para gerar recomendações personalizadas de estilo, coloração, modelagens e guarda-roupa.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">3. Uso das Imagens</h2>
          <p>As fotos enviadas são utilizadas exclusivamente para a geração do diagnóstico. Não compartilhamos suas imagens com terceiros e elas são armazenadas de forma segura em nossos servidores.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">4. Responsabilidades</h2>
          <p>As recomendações geradas pela IA são sugestões baseadas em análise algorítmica e não substituem a consultoria presencial de um profissional de imagem. A EST ELITE não se responsabiliza por decisões tomadas com base nas recomendações fornecidas.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">5. Pagamento e Assinatura</h2>
          <p>Os planos e preços estão disponíveis na página de preços. Ao assinar, você concorda com os valores e condições apresentados. Cancelamentos podem ser realizados a qualquer momento através da sua conta.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">6. Contato</h2>
          <p>Para dúvidas ou questões sobre estes termos, entre em contato pelo e-mail <a href="mailto:contato@estelite.com.br" className="text-primary hover:underline">contato@estelite.com.br</a>.</p>
        </div>
      </div>
    </Layout>
  );
}
