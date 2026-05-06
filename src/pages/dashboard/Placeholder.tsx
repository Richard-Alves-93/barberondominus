import { Card } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Construction } from "lucide-react";

export const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <div className="flex-1 flex flex-col">
    <header className="h-16 border-b bg-card flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-40">
      <SidebarTrigger />
      <h1 className="font-display font-bold text-xl">{title}</h1>
    </header>
    <main className="flex-1 p-4 lg:p-6">
      <Card className="p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[60vh]">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Construction className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl mb-1">{title}</h2>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground">Em breve disponível neste módulo.</p>
      </Card>
    </main>
  </div>
);
