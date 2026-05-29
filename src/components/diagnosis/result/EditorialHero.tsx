interface EditorialHeroProps {
  sectionImage: string;
  conditionalImage?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function EditorialHero({ sectionImage, conditionalImage, title, subtitle, children }: EditorialHeroProps) {
  return (
    <div className="space-y-8 md:space-y-12">
      {/* 2-column hero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 lg:gap-16 items-start">
        {/* Left: editorial image */}
        <div className="space-y-4 md:space-y-6">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] md:aspect-auto md:min-h-[420px]">
            <img
              src={sectionImage}
              alt={title}
              className="w-full h-full object-cover absolute inset-0"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          {conditionalImage && conditionalImage !== '/assets/default.jpg' && (
            <div className="rounded-xl overflow-hidden border border-primary/20 max-h-[200px] md:max-h-[280px]">
              <img
                src={conditionalImage}
                alt="Resultado"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Right: text content */}
        <div className="space-y-4 md:space-y-6 pt-1 md:pt-2">
          <h2 className="font-serif font-bold text-foreground leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-primary text-base md:text-lg font-serif">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
