import { Layout } from '@/components/layout/Layout';

export default function Privacy() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-serif text-4xl md:text-5xl text-gradient-gold mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">1. Coleta de Dados</h2>
          <p>Coletamos as seguintes informações: nome completo, endereço de e-mail, fotos enviadas para diagnóstico e respostas ao questionário de estilo de vida.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">2. Uso dos Dados</h2>
          <p>Seus dados são utilizados exclusivamente para: geração do diagnóstico de imagem pessoal, comunicação sobre seu diagnóstico e melhorias no serviço, e processamento de pagamentos.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">3. Armazenamento e Segurança</h2>
          <p>Suas informações são armazenadas em servidores seguros com criptografia. Utilizamos práticas de segurança atualizadas para proteger seus dados contra acesso não autorizado.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">4. Compartilhamento</h2>
          <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, exceto quando necessário para o processamento de pagamentos ou quando exigido por lei.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">5. Seus Direitos</h2>
          <p>Você tem direito a: acessar seus dados pessoais, solicitar correção de dados incorretos, solicitar exclusão dos seus dados e revogar o consentimento para uso dos dados.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">6. Cookies</h2>
          <p>Utilizamos cookies essenciais para manter sua sessão ativa e melhorar a experiência de uso da plataforma.</p>

          <h2 className="font-serif text-2xl text-foreground mt-8">7. Contato</h2>
          <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato pelo e-mail <a href="mailto:contato@estelite.com.br" className="text-primary hover:underline">contato@estelite.com.br</a>.</p>
        </div>
      </div>
    </Layout>
  );
}
