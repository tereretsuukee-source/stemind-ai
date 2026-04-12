import { motion } from "framer-motion";
import {
  ShieldCheck,
  Camera,
  Brain,
  BookOpen,
  BarChart3,
  Lightbulb,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Triple-Verification Engine",
    description:
      "Three AI agents — Solver, Critic, and Verifier — must agree before you see an answer. No hallucinations, no guessing.",
    color: "text-stemind-cyan",
    bgColor: "bg-stemind-cyan/10",
    borderColor: "border-stemind-cyan/20",
  },
  {
    icon: Camera,
    title: "Multimodal Input",
    description:
      "Snap photos of handwritten notes, upload diagrams, or paste text. Our OCR handles messy handwriting and LaTeX conversion.",
    color: "text-stemind-amber",
    bgColor: "bg-stemind-amber/10",
    borderColor: "border-stemind-amber/20",
  },
  {
    icon: Brain,
    title: "Personal Knowledge Graph",
    description:
      "STEMind maps what you know and don't know. It tracks mastery across topics and auto-generates targeted practice.",
    color: "text-stemind-rose",
    bgColor: "bg-stemind-rose/10",
    borderColor: "border-stemind-rose/20",
  },
  {
    icon: Lightbulb,
    title: "Socratic Tutoring",
    description:
      "Rather than handing you answers, STEMind guides you with hints and questions — so you actually learn the material.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  {
    icon: BookOpen,
    title: "AI Cheatsheet Builder",
    description:
      "Upload a 50-page chapter and get a structured, formula-rich one-pager with mnemonics — ready for exam day.",
    color: "text-stemind-cyan",
    bgColor: "bg-stemind-cyan/10",
    borderColor: "border-stemind-cyan/20",
  },
  {
    icon: BarChart3,
    title: "Interactive Visualizer",
    description:
      "See equations come alive with real-time graphs, 3D surfaces, and physics simulations rendered right in your workspace.",
    color: "text-stemind-amber",
    bgColor: "bg-stemind-amber/10",
    borderColor: "border-stemind-amber/20",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-28 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-primary mb-3 block">
            Features
          </span>
          <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-4">
            Precision tools for
            <br />
            <span className="text-gradient">serious learners</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Every feature is designed around one goal: helping you deeply understand STEM — not just get answers.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-7 hover:glow-card transition-shadow duration-500"
            >
              <div
                className={`w-12 h-12 rounded-xl ${feature.bgColor} border ${feature.borderColor} flex items-center justify-center mb-5`}
              >
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
