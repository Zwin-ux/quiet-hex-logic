import { memo, forwardRef } from 'react';
import { Shield, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Shield,
    label: 'Verified Fair',
    description: 'On-chain verification and anti-cheat systems ensure absolute competitive integrity.',
  },
  {
    icon: Zap,
    label: 'Neural Engine',
    description: 'Blazing fast AI response times powered by highly optimized strategy engines.',
  },
  {
    icon: Users,
    label: 'Multi-Hub',
    description: 'Seamless cross-platform play between desktop, web, and tactical interfaces.',
  },
];

export const FeaturesShowcase = memo(forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  return (
    <section 
      ref={ref}
      className={cn("py-32 px-6 relative", className)}
      {...props}
    >
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-20 space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary animate-gentle-pulse">Technical Excellence</p>
          <h2 className="text-5xl md:text-6xl font-display-text font-bold text-white tracking-tight">Built for Competition</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A high-performance strategy hub designed for tactical excellence and cross-platform play.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-16">
          {features.map((f) => (
            <div
              key={f.label}
              className="group text-center space-y-8"
            >
              <div className="mx-auto h-24 w-24 rounded-[2rem] glass flex items-center justify-center border-white/10 group-hover:border-primary/40 group-hover:shadow-glow transition-all duration-500">
                <f.icon className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="space-y-4">
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
