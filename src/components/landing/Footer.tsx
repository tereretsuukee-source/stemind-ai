import { Brain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-stemind flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight text-foreground">
              STEM<span className="text-gradient">ind</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-3 ml-1">
              Triple-verified AI tutor for STEM
            </span>
          </div>

          <div className="flex items-center gap-8">
            <a
              href="mailto:hello@stemind.app"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2026 STEMind. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
