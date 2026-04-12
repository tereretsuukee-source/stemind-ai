import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-28 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-stemind" />
          <div className="absolute inset-0 noise" />

          <div className="relative z-10 px-8 py-20 sm:px-16 sm:py-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-8">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white/90">
                Free tier — no credit card required
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight mb-5 leading-tight">
              Stop guessing.
              <br />
              Start understanding.
            </h2>

            <p className="text-lg text-white/70 max-w-lg mx-auto mb-10 leading-relaxed">
              Join thousands of students using triple-verified AI to master STEM — from tonight's homework to tomorrow's exam.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 text-base px-8 py-6 font-semibold"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-base px-8 py-6"
              >
                View Pricing
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
