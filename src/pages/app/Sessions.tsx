import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, MessagesSquare, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const Sessions = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; subject?: string }) => {
      const { error } = await supabase.from("study_sessions").insert({
        user_id: user!.id,
        title: input.title,
        subject: input.subject || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", user?.id] });
      setOpen(false);
      setTitle("");
      setSubject("");
      toast({ title: t("sessions.created") });
    },
    onError: (e: Error) =>
      toast({ title: t("sessions.createError"), description: e.message, variant: "destructive" }),
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("study_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", user?.id] });
      toast({ title: t("sessions.deleted") });
    },
    onError: (e: Error) =>
      toast({ title: t("sessions.deleteError"), description: e.message, variant: "destructive" }),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({ title: title.trim(), subject: subject.trim() || undefined });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">{t("sessions.title")}</h1>
          <p className="text-muted-foreground">{t("sessions.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-stemind text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> {t("sessions.newSession")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("sessions.createSession")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("sessions.sessionTitle")}</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("sessions.titlePlaceholder")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{t("sessions.subject")}</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("sessions.subjectPlaceholder")} />
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full bg-gradient-stemind text-primary-foreground hover:opacity-90">
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sessions.create")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading && (
        <div className="grid md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 border-border/60">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && sessions && sessions.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <MessagesSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display font-semibold mb-1">{t("sessions.noSessions")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("sessions.noSessionsDesc")}
          </p>
          <Button onClick={() => setOpen(true)} className="bg-gradient-stemind text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> {t("sessions.createFirst")}
          </Button>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {sessions?.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-5 border-border/60 hover:border-primary/40 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <Link to={`/app/sessions/${s.id}`} className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold truncate">{s.title}</h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.subject || t("sessions.general")} · {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("sessions.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("sessions.deleteDesc", { title: s.title })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("sessions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSession.mutate(s.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("sessions.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Link to={`/app/sessions/${s.id}`}>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Sessions;
