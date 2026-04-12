import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 noise" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, hsl(250 90% 60% / 0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, hsl(185 80% 55% / 0.1) 0%, transparent 70%)",
          animationDelay: "1.5s",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-8"
          >
            <ShieldCheck className="w-4 h-4 text-stemind-cyan" />
            <span className="text-sm font-medium text-muted-foreground">
              Triple-verified precision — not just another chatbot
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight mb-6"
          >
            Your AI STEM copilot
            <br />
            that{" "}
            <span className="text-gradient">never guesses.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Snap a photo of any problem. Three AI agents solve, critique, and
            verify every answer — so you learn with confidence from algebra to
            quantum mechanics.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              size="lg"
              className="bg-gradient-stemind hover:opacity-90 transition-opacity text-primary-foreground text-base px-8 py-6 glow-primary"
            >
              Start Solving Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 border-border text-foreground hover:bg-muted"
            >
              Watch Demo
            </Button>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { icon: ShieldCheck, label: "Triple-Verified Answers", color: "text-stemind-cyan" },
              { icon: Camera, label: "Photo & Handwriting Input", color: "text-stemind-amber" },
              { icon: Sparkles, label: "Socratic Tutoring Mode", color: "text-stemind-rose" },
            ].map((pill) => (
              <div
                key={pill.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border"
              >
                <pill.icon className={`w-4 h-4 ${pill.color}`} />
                <span className="text-sm font-medium text-foreground">
                  {pill.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero visual — chat mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden glow-card">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
              <div className="w-3 h-3 rounded-full bg-stemind-rose/60" />
              <div className="w-3 h-3 rounded-full bg-stemind-amber/60" />
              <div className="w-3 h-3 rounded-full bg-stemind-cyan/60" />
              <span className="ml-3 text-xs text-muted-foreground font-medium">STEMind — Calculus Session</span>
            </div>

            {/* Chat content */}
            <div className="p-6 space-y-5">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-5 py-3 max-w-sm">
                  <p className="text-sm text-foreground">
                    Find the derivative of f(x) = x³·ln(x)
                  </p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-stemind flex-shrink-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-5 py-4 max-w-md">
                  <p className="text-sm text-foreground leading-relaxed">
                    Great question! Let's use the <strong>product rule</strong>.
                    <br />
                    <br />
                    <span className="text-muted-foreground">Think about it: if f(x) = u·v, what are u and v here?</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-stemind-cyan/10 border border-stemind-cyan/20">
                      <ShieldCheck className="w-3 h-3 text-stemind-cyan" />
                      <span className="text-[11px] text-stemind-cyan font-medium">3/3 Verified</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Socratic mode</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="px-6 pb-5">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Type or snap a photo of your problem...</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
