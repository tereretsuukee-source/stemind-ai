import { motion } from "framer-motion";
import { Upload, Cpu, ShieldCheck, GraduationCap } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Submit Your Problem",
    description: "Type it, snap a photo, or upload a PDF. STEMind handles any format — even messy handwriting.",
    color: "text-stemind-amber",
    gradient: "from-stemind-amber/20 to-transparent",
  },
  {
    number: "02",
    icon: Cpu,
    title: "Triple-Agent Processing",
    description: "The Solver generates a solution. The Critic hunts for flaws. The Verifier runs it through a symbolic engine.",
    color: "text-stemind-cyan",
    gradient: "from-stemind-cyan/20 to-transparent",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Consensus & Verification",
    description: "Only when all three agents agree — or pass confidence thresholds — is the answer shown to you.",
    color: "text-primary",
    gradient: "from-primary/20 to-transparent",
  },
  {
    number: "04",
    icon: GraduationCap,
    title: "Learn & Master",
    description: "Get step-by-step explanations in Socratic mode. Your knowledge graph updates, targeting weak spots automatically.",
    color: "text-stemind-rose",
    gradient: "from-stemind-rose/20 to-transparent",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-28 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-primary mb-3 block">
            How It Works
          </span>
          <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-4">
            From question to{" "}
            <span className="text-gradient">verified answer</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Four steps. Three AI agents. One answer you can trust.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 overflow-hidden"
            >
              {/* Background gradient */}
              <div
                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${step.gradient}`}
              />

              <div className="flex items-start gap-5">
                <div className="flex-shrink-0">
                  <span className="text-4xl font-display font-bold text-muted/80">
                    {step.number}
                  </span>
                </div>
                <div>
                  <div className={`inline-flex items-center gap-2 mb-3`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
