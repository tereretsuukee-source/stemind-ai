import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export type Verification = "passed" | "uncertain" | "failed";

const HEDGES = /\b(I'?m not sure|cannot determine|unable to|might be wrong|approximate|roughly|uncertain)\b/i;

export const extractFinalAnswer = (text: string): { answer: string | null; verification: Verification } => {
  const m = text.match(/\*\*Final answer:\*\*\s*([\s\S]+?)(?:\n\s*\n|$)/i);
  if (!m) return { answer: null, verification: "uncertain" };
  const answer = m[1].trim();
  const verification: Verification = HEDGES.test(text) ? "uncertain" : "passed";
  return { answer, verification };
};

const RenderMath = ({ text }: { text: string }) => {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$"))
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        if (part.startsWith("$") && part.endsWith("$"))
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        return (
          <ReactMarkdown
            key={i}
            components={{
              p: ({ children }) => <span>{children}</span>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
};

interface Props {
  answer: string;
  verification: Verification;
}

export const FinalAnswerCard = ({ answer, verification }: Props) => {
  const { t } = useTranslation();

  const cfg = {
    passed: { Icon: CheckCircle2, label: t("session.verifPassed"), cls: "border-stemind-cyan/40 bg-stemind-cyan/5", chip: "bg-stemind-cyan/10 text-stemind-cyan" },
    uncertain: { Icon: AlertTriangle, label: t("session.verifUncertain"), cls: "border-stemind-amber/40 bg-stemind-amber/5", chip: "bg-stemind-amber/10 text-stemind-amber" },
    failed: { Icon: XCircle, label: t("session.verifFailed"), cls: "border-destructive/40 bg-destructive/5", chip: "bg-destructive/10 text-destructive" },
  }[verification];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("rounded-xl border-2 p-4 mt-2", cfg.cls)}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {t("session.finalAnswerLabel")}
        </div>
        <div className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.chip)}>
          <cfg.Icon className="w-3 h-3" />
          {cfg.label}
        </div>
      </div>
      <div className="font-display text-base md:text-lg leading-snug break-words">
        <RenderMath text={answer} />
      </div>
    </motion.div>
  );
};
