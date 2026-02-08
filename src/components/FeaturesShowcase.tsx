import { memo, forwardRef } from 'react';
import { Shield, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Shield,
    label: 'Fair Play',
    description: 'Server-side move validation and anti-cheat ensure competitive integrity.',
  },
  {
    icon: Zap,
    label: 'Fast AI',
    description: 'Optimized engines deliver instant AI responses at every difficulty level.',
  },
  {
    icon: Users,
    label: 'Cross-Platform',
    description: 'Play on web, mobile, or inside Discord — your progress follows you.',
  },
];

export const FeaturesShowcase = memo(forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  return (
    <section
      ref={ref}
      className={cn("py-24 px-6 relative", className)}
      {...props}
    >
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-14 space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary animate-gentle-pulse">Technical Excellence</p>
          <h2 className="text-5xl md:text-6xl font-display-text font-bold text-white tracking-tight">Built for Competition</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-10">
          {features.map((f) => (
            <div
              key={f.label}
              className="group text-center space-y-6"
            >
              <div className="mx-auto h-20 w-20 rounded-2xl glass flex items-center justify-center border-white/10 group-hover:border-primary/40 group-hover:shadow-glow transition-all duration-500">
                <f.icon className="h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-mono uppercase tracking-[0.3em] text-primary">{f.label}</p>
                <p className="text-muted-foreground leading-relaxed text-base max-w-[280px] mx-auto">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}));

FeaturesShowcase.displayName = 'FeaturesShowcase';
