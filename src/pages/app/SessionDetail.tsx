import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stemindApi } from "@/lib/stemind-api";

const SessionDetail = () => {
  const { id } = useParams();

  return (
    <div className="flex flex-col h-screen">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card/50 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/app/sessions">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-sm truncate">
            Session #{id}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Powered by STEMind Backend
          </p>
        </div>
      </header>

      <iframe
        src={stemindApi.baseUrl}
        className="flex-1 w-full border-0"
        title="STEMind Backend"
        allow="clipboard-write; clipboard-read"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

export default SessionDetail;
