import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import type { QuestionnaireData } from '@/pages/NewDiagnosis';

interface QuestionnaireStepProps {
  questionnaire: QuestionnaireData;
  setQuestionnaire: React.Dispatch<React.SetStateAction<QuestionnaireData>>;
}

const occasions = [
  { id: 'work', label: 'Trabalho/Escritório' },
  { id: 'casual', label: 'Casual/Dia a dia' },
  { id: 'events', label: 'Eventos sociais' },
  { id: 'formal', label: 'Ocasiões formais' },
  { id: 'sports', label: 'Esportes/Academia' },
  { id: 'travel', label: 'Viagens' },
];

const styleOptions = [
  { id: 'classic', label: 'Clássico e atemporal' },
  { id: 'romantic', label: 'Romântico e delicado' },
  { id: 'modern', label: 'Moderno e minimalista' },
  { id: 'bold', label: 'Ousado e marcante' },
  { id: 'bohemian', label: 'Boho e despojado' },
  { id: 'elegant', label: 'Elegante e sofisticado' },
];

const hairColors = [
  { value: 'preto', label: 'Preto' },
  { value: 'castanho_escuro', label: 'Castanho Escuro' },
  { value: 'castanho_claro', label: 'Castanho Claro' },
  { value: 'loiro', label: 'Loiro' },
  { value: 'ruivo', label: 'Ruivo' },
  { value: 'grisalho', label: 'Grisalho' },
  { value: 'outro', label: 'Outro' },
];

const eyeColors = [
  { value: 'castanho_escuro', label: 'Castanho Escuro' },
  { value: 'castanho_claro', label: 'Castanho Claro' },
  { value: 'verde', label: 'Verde' },
  { value: 'azul', label: 'Azul' },
  { value: 'mel', label: 'Mel' },
  { value: 'outro', label: 'Outro' },
];

const skinTones = [
  { value: 'muito_claro', label: 'Muito Claro' },
  { value: 'claro', label: 'Claro' },
  { value: 'medio', label: 'Médio' },
  { value: 'moreno', label: 'Moreno' },
  { value: 'escuro', label: 'Escuro' },
];

const bodyTypes = [
  { value: 'hourglass', label: 'Ampulheta' },
  { value: 'inverted-triangle', label: 'Triângulo Invertido' },
  { value: 'triangle', label: 'Triângulo' },
  { value: 'rectangle', label: 'Retângulo' },
  { value: 'oval', label: 'Oval' },
];

const fitPreferences = [
  { value: 'justo', label: 'Justo ao corpo' },
  { value: 'ajustado', label: 'Levemente ajustado' },
  { value: 'regular', label: 'Regular / confortável' },
  { value: 'amplo', label: 'Amplo / oversized' },
];

const formalityLevels = [
  { value: 'casual', label: 'Casual' },
  { value: 'smart_casual', label: 'Smart Casual' },
  { value: 'business_casual', label: 'Business Casual' },
  { value: 'formal', label: 'Formal / Social' },
];

export function QuestionnaireStep({ questionnaire, setQuestionnaire }: QuestionnaireStepProps) {
  const updateField = <K extends keyof QuestionnaireData>(field: K, value: QuestionnaireData[K]) => {
    setQuestionnaire(prev => ({ ...prev, [field]: value }));
  };

  const selectOccasion = (id: string) => {
    setQuestionnaire(prev => ({
      ...prev,
      occasions: prev.occasions.includes(id) ? [] : [id],
    }));
  };

  const selectStyle = (id: string) => {
    setQuestionnaire(prev => ({
      ...prev,
      preferences: prev.preferences.includes(id) ? [] : [id],
    }));
  };

  const FieldLabel = ({
    htmlFor,
    required,
    helper,
    children,
  }: {
    htmlFor?: string;
    required?: boolean;
    helper?: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-foreground text-sm sm:text-base">
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {helper && (
        <p className="text-xs text-muted-foreground leading-relaxed">{helper}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2">
          <h2 className="text-2xl font-serif font-bold text-foreground">
            Sobre <span className="text-primary">Você</span>
          </h2>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full text-primary/80 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Ajuda"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="max-w-[250px] bg-background/95 backdrop-blur border border-border text-foreground text-xs shadow-lg px-3 py-2 rounded-lg"
              >
                Responda às perguntas abaixo para receber sua análise de imagem completa e personalizada.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ===== BLOCO 1: Estilo de Vida ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">1</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground">Estilo de Vida</h3>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="lifestyle" required helper="Exemplo: rotina de trabalho, frequência de eventos sociais, hobbies, atividades físicas e estilo de vida geral.">
            Descreva seu estilo de vida
          </FieldLabel>
          <Textarea id="lifestyle" placeholder="Digite aqui..."
            value={questionnaire.lifestyle} onChange={(e) => updateField('lifestyle', e.target.value)}
            className="min-h-[80px] bg-background border-border" maxLength={500} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="profession" required helper="Informe sua profissão ou área principal de atuação.">
            Qual sua profissão?
          </FieldLabel>
          <Input id="profession" placeholder="Digite aqui..."
            value={questionnaire.profession} onChange={(e) => updateField('profession', e.target.value)}
            className="bg-background border-border" maxLength={200} />
        </div>

        <div className="space-y-3">
          <FieldLabel helper="Selecione a ocasião principal para a qual você deseja o look recomendado.">
            Para qual ocasião é este look?
          </FieldLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {occasions.map(({ id, label }) => (
              <div key={id} className={`flex items-center justify-center p-3 rounded-lg border transition-all cursor-pointer text-center ${
                questionnaire.occasions.includes(id) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 text-foreground'
              }`} onClick={() => selectOccasion(id)}>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-foreground">Orçamento mensal para roupas *</Label>
            <Select value={questionnaire.budget} onValueChange={(v) => updateField('budget', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Até R$ 500</SelectItem>
                <SelectItem value="medium">R$ 500 - R$ 1.500</SelectItem>
                <SelectItem value="high">R$ 1.500 - R$ 3.000</SelectItem>
                <SelectItem value="premium">Acima de R$ 3.000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Clima predominante *</Label>
            <Select value={questionnaire.climate} onValueChange={(v) => updateField('climate', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tropical">Tropical (quente o ano todo)</SelectItem>
                <SelectItem value="subtropical">Subtropical (verões quentes, invernos amenos)</SelectItem>
                <SelectItem value="temperate">Temperado (4 estações definidas)</SelectItem>
                <SelectItem value="cold">Frio (predominantemente frio)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ===== BLOCO 2: Dados Corporais ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">2</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground">Dados Corporais</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="heightCm" className="text-foreground">Altura (cm)</Label>
            <Input id="heightCm" type="number" placeholder="Ex: 165"
              value={questionnaire.heightCm} onChange={(e) => updateField('heightCm', e.target.value)}
              className="bg-background border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg" className="text-foreground">Peso (kg)</Label>
            <Input id="weightKg" type="number" placeholder="Ex: 60"
              value={questionnaire.weightKg} onChange={(e) => updateField('weightKg', e.target.value)}
              className="bg-background border-border" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-foreground">Tamanho superior</Label>
            <Select value={questionnaire.topSize} onValueChange={(v) => updateField('topSize', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PP">PP</SelectItem>
                <SelectItem value="P">P</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="G">G</SelectItem>
                <SelectItem value="GG">GG</SelectItem>
                <SelectItem value="XG">XG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Tamanho inferior</Label>
            <Select value={questionnaire.bottomSize} onValueChange={(v) => updateField('bottomSize', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="34">34</SelectItem>
                <SelectItem value="36">36</SelectItem>
                <SelectItem value="38">38</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="42">42</SelectItem>
                <SelectItem value="44">44</SelectItem>
                <SelectItem value="46">46</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Tamanho calçado</Label>
            <Select value={questionnaire.shoeSize} onValueChange={(v) => updateField('shoeSize', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {[33, 34, 35, 36, 37, 38, 39, 40, 41, 42].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Tipo corporal (como você se percebe)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {bodyTypes.map(({ value, label }) => (
              <div key={value} className={`flex items-center justify-center p-3 rounded-lg border transition-all cursor-pointer text-center ${
                questionnaire.bodyType === value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 text-foreground'
              }`} onClick={() => updateField('bodyType', value)}>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-foreground">Preferência de caimento</Label>
            <Select value={questionnaire.fitPreference} onValueChange={(v) => updateField('fitPreference', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {fitPreferences.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Nível de formalidade preferido</Label>
            <Select value={questionnaire.formalityLevel} onValueChange={(v) => updateField('formalityLevel', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {formalityLevels.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="bodyNotes" helper="Compartilhe detalhes sobre seu corpo que possam ajudar na análise, como proporções, cintura, ombros ou quadris.">
            Observações sobre seu corpo
          </FieldLabel>
          <Textarea id="bodyNotes" placeholder="Digite aqui..."
            value={questionnaire.bodyNotes} onChange={(e) => updateField('bodyNotes', e.target.value)}
            className="min-h-[60px] bg-background border-border" maxLength={500} />
        </div>
      </div>

      {/* ===== BLOCO 3: Coloração Natural ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">3</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground">Coloração Natural</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-foreground">Cor do cabelo</Label>
            <Select value={questionnaire.hairColor} onValueChange={(v) => updateField('hairColor', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {hairColors.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Cor dos olhos</Label>
            <Select value={questionnaire.eyeColor} onValueChange={(v) => updateField('eyeColor', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {eyeColors.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Tom de pele</Label>
            <Select value={questionnaire.skinTone} onValueChange={(v) => updateField('skinTone', v)}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {skinTones.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ===== BLOCO 4: Preferência de Estilo ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">4</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground">Preferência de Estilo</h3>
        </div>

        <div className="space-y-3">
          <Label className="text-foreground">Qual estilo mais te representa? <span className="text-xs text-muted-foreground">(escolha um)</span></Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {styleOptions.map(({ id, label }) => (
              <div key={id} className={`flex items-center justify-center p-3 rounded-lg border transition-all cursor-pointer text-center ${
                questionnaire.preferences.includes(id) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 text-foreground'
              }`} onClick={() => selectStyle(id)}>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== BLOCO 5: Objetivos ===== */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">5</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground">Objetivos</h3>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="goals" required helper="Descreva o que você espera alcançar com este diagnóstico, como looks para trabalho, eventos ou o dia a dia.">
            O que você espera deste diagnóstico?
          </FieldLabel>
          <Textarea id="goals" placeholder="Digite aqui..."
            value={questionnaire.goals} onChange={(e) => updateField('goals', e.target.value)}
            className="min-h-[80px] bg-background border-border" maxLength={500} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="challenges" helper="Conte suas maiores dificuldades ao se vestir, como combinar peças, encontrar tamanhos ou adaptar a um estilo.">
            Maiores desafios ao se vestir
          </FieldLabel>
          <Textarea id="challenges" placeholder="Digite aqui..."
            value={questionnaire.challenges} onChange={(e) => updateField('challenges', e.target.value)}
            className="min-h-[60px] bg-background border-border" maxLength={500} />
        </div>
      </div>
    </div>
  );
}
