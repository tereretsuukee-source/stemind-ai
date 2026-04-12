import { motion } from "framer-motion";

const subjects = [
  { name: "Calculus", emoji: "∫", description: "Limits, derivatives, integrals, series" },
  { name: "Algebra", emoji: "x²", description: "Linear, abstract, Boolean" },
  { name: "Physics", emoji: "⚛", description: "Mechanics, E&M, quantum, thermo" },
  { name: "Chemistry", emoji: "🧪", description: "Organic, inorganic, biochem" },
  { name: "Statistics", emoji: "📊", description: "Probability, inference, regression" },
  { name: "Geometry", emoji: "△", description: "Euclidean, analytic, differential" },
  { name: "Computer Science", emoji: "λ", description: "Algorithms, data structures, theory" },
  { name: "Biology", emoji: "🧬", description: "Molecular, genetics, ecology" },
];

const SubjectsSection = () => {
  return (
    <section id="subjects" className="py-28 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-primary mb-3 block">
            Subjects
          </span>
          <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-4">
            Every STEM field.{" "}
            <span className="text-gradient">One copilot.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From high-school algebra to PhD-level quantum mechanics — STEMind adapts to your level.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {subjects.map((subject, i) => (
            <motion.div
              key={subject.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 text-center hover:border-primary/30 hover:glow-card transition-all duration-300 cursor-default"
            >
              <div className="text-3xl mb-3 font-display">{subject.emoji}</div>
              <h3 className="text-sm font-display font-semibold text-foreground mb-1">
                {subject.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-snug">
                {subject.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;
