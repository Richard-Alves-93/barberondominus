import { useEffect, useMemo, useState } from "react";
import { format, addDays, startOfDay, startOfWeek, addMinutes, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Filter } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Barber = { id: string; name: string; color: string };
type Service = { id: string; name: string; duration_minutes: number; price: number };
type Client = { id: string; name: string };
type Appt = {
  id: string;
  barber_id: string;
  client_id: string | null;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "no_show" | "cancelled";
  notes: string | null;
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08h–20h
const SLOT_MIN = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const SLOT_HEIGHT = 28; // px per 30min

const STATUS_LABEL: Record<Appt["status"], string> = {
  scheduled: "Agendado", confirmed: "Confirmado", in_progress: "Em andamento",
  completed: "Concluído", no_show: "Não compareceu", cancelled: "Cancelado",
};
const STATUS_STYLE: Record<Appt["status"], string> = {
  scheduled: "bg-muted text-foreground border-border",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-accent/20 text-accent-foreground border-accent/40",
  completed: "bg-success/15 text-success border-success/30",
  no_show: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted/50 text-muted-foreground line-through border-border",
};

export default function Agenda() {
  const { user } = useAuth();
  const [view, setView] = useState<"day" | "week">("day");
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [filterBarbers, setFilterBarbers] = useState<string[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; appt?: Partial<Appt> & { id?: string } }>({ open: false });

  const visibleBarbers = useMemo(
    () => (filterBarbers.length ? barbers.filter((b) => filterBarbers.includes(b.id)) : barbers),
    [barbers, filterBarbers]
  );

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const loadAll = async () => {
    if (!user) return;
    const [b, s, c] = await Promise.all([
      supabase.from("barbers").select("id,name,color").eq("active", true).order("name"),
      supabase.from("services").select("id,name,duration_minutes,price").eq("active", true).order("name"),
      supabase.from("clients").select("id,name").order("name"),
    ]);
    if (b.data) setBarbers(b.data);
    if (s.data) setServices(s.data);
    if (c.data) setClients(c.data);
  };

  const loadAppts = async () => {
    if (!days.length) return;
    const start = days[0].toISOString();
    const end = addDays(days[days.length - 1], 1).toISOString();
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .gte("starts_at", start)
      .lt("starts_at", end);
    if (data) setAppts(data as Appt[]);
  };

  useEffect(() => { loadAll(); }, [user]);
  useEffect(() => { loadAppts(); }, [user, view, cursor]);

  const moveAppt = async (id: string, newBarberId: string, newStart: Date) => {
    const a = appts.find((x) => x.id === id);
    if (!a) return;
    const dur = (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000;
    const newEnd = addMinutes(newStart, dur);
    setAppts((prev) => prev.map((x) => x.id === id ? { ...x, barber_id: newBarberId, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() } : x));
    const { error } = await supabase
      .from("appointments")
      .update({ barber_id: newBarberId, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() })
      .eq("id", id);
    if (error) { toast.error("Erro ao mover agendamento"); loadAppts(); }
    else toast.success("Agendamento movido");
  };

  const setStatus = async (id: string, status: Appt["status"]) => {
    setAppts((p) => p.map((x) => x.id === id ? { ...x, status } : x));
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error("Erro ao atualizar status"); else toast.success("Status atualizado");
  };

  const deleteAppt = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    setAppts((p) => p.filter((x) => x.id !== id));
    toast.success("Agendamento excluído");
    setDialog({ open: false });
  };

  const saveAppt = async (form: any) => {
    if (!user) return;
    const svc = services.find((s) => s.id === form.service_id);
    const dur = svc?.duration_minutes ?? 30;
    const starts = new Date(form.starts_at);
    const ends = addMinutes(starts, dur);
    const payload = {
      owner_id: user.id,
      barber_id: form.barber_id,
      client_id: form.client_id || null,
      service_id: form.service_id || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: form.status,
      notes: form.notes || null,
    };
    if (form.id) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", form.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Agendamento atualizado");
    } else {
      const { error } = await supabase.from("appointments").insert(payload);
      if (error) return toast.error("Erro ao criar");
      toast.success("Agendamento criado");
    }
    setDialog({ open: false });
    loadAppts();
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger />
          <h1 className="font-display font-bold text-xl truncate">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setDialog({ open: true, appt: { starts_at: addMinutes(cursor, 9 * 60).toISOString(), status: "scheduled", barber_id: barbers[0]?.id } })}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-3 border-b bg-card flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, view === "day" ? -1 : -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, view === "day" ? 1 : 7))}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 font-medium text-sm capitalize">
            {view === "day"
              ? format(cursor, "EEEE, d 'de' MMMM", { locale: ptBR })
              : `${format(days[0], "d MMM", { locale: ptBR })} – ${format(days[6], "d MMM yyyy", { locale: ptBR })}`}
          </span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Barbeiros{filterBarbers.length ? ` (${filterBarbers.length})` : ""}</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="space-y-2">
              {barbers.map((b) => (
                <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={filterBarbers.includes(b.id)}
                    onCheckedChange={(v) => setFilterBarbers((p) => v ? [...p, b.id] : p.filter((x) => x !== b.id))}
                  />
                  <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
                  {b.name}
                </label>
              ))}
              {!barbers.length && <p className="text-xs text-muted-foreground">Cadastre barbeiros primeiro.</p>}
              {filterBarbers.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilterBarbers([])}>Limpar</Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <main className="flex-1 overflow-auto p-4 lg:p-6">
        {!visibleBarbers.length ? (
          <Card className="p-10 text-center text-muted-foreground">
            Cadastre barbeiros em <strong className="text-foreground">Barbeiros</strong> para começar a usar a agenda.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-auto">
              <div className="min-w-fit">
                {days.map((day) => (
                  <DayGrid
                    key={day.toISOString()}
                    day={day}
                    barbers={visibleBarbers}
                    appts={appts.filter((a) => isSameDay(parseISO(a.starts_at), day))}
                    onDropAppt={moveAppt}
                    onClickAppt={(a) => setDialog({ open: true, appt: a })}
                    onClickSlot={(barberId, start) => setDialog({ open: true, appt: { barber_id: barberId, starts_at: start.toISOString(), status: "scheduled" } })}
                    showDayHeader={view === "week"}
                    barberColors={Object.fromEntries(barbers.map((b) => [b.id, b.color]))}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}
      </main>

      <ApptDialog
        open={dialog.open}
        appt={dialog.appt}
        barbers={barbers}
        services={services}
        clients={clients}
        onClose={() => setDialog({ open: false })}
        onSave={saveAppt}
        onDelete={deleteAppt}
        onStatus={setStatus}
      />
    </div>
  );
}

function DayGrid({
  day, barbers, appts, onDropAppt, onClickAppt, onClickSlot, showDayHeader, barberColors,
}: {
  day: Date; barbers: Barber[]; appts: Appt[];
  onDropAppt: (id: string, barberId: string, start: Date) => void;
  onClickAppt: (a: Appt) => void;
  onClickSlot: (barberId: string, start: Date) => void;
  showDayHeader: boolean;
  barberColors: Record<string, string>;
}) {
  return (
    <div className="border-b last:border-b-0">
      {showDayHeader && (
        <div className="px-3 py-2 bg-muted/40 border-b text-sm font-semibold capitalize">
          {format(day, "EEEE, d 'de' MMM", { locale: ptBR })}
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(${barbers.length}, minmax(140px, 1fr))` }}>
        {/* Header row */}
        <div className="border-b border-r bg-muted/20" />
        {barbers.map((b) => (
          <div key={b.id} className="border-b border-r px-3 py-2 text-sm font-semibold flex items-center gap-2 bg-muted/20">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
            <span className="truncate">{b.name}</span>
          </div>
        ))}

        {/* Time column */}
        <div>
          {HOURS.map((h) => (
            <div key={h} style={{ height: SLOT_HEIGHT * SLOTS_PER_HOUR }} className="border-r border-b text-[10px] text-muted-foreground px-1.5 pt-0.5">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Barber columns */}
        {barbers.map((b) => (
          <BarberColumn
            key={b.id}
            day={day}
            barber={b}
            appts={appts.filter((a) => a.barber_id === b.id)}
            onDropAppt={onDropAppt}
            onClickAppt={onClickAppt}
            onClickSlot={onClickSlot}
            barberColors={barberColors}
          />
        ))}
      </div>
    </div>
  );
}

function BarberColumn({
  day, barber, appts, onDropAppt, onClickAppt, onClickSlot, barberColors,
}: {
  day: Date; barber: Barber; appts: Appt[];
  onDropAppt: (id: string, barberId: string, start: Date) => void;
  onClickAppt: (a: Appt) => void;
  onClickSlot: (barberId: string, start: Date) => void;
  barberColors: Record<string, string>;
}) {
  const slots = HOURS.flatMap((h) => Array.from({ length: SLOTS_PER_HOUR }, (_, i) => ({ h, m: i * SLOT_MIN })));

  return (
    <div className="relative border-r">
      {slots.map(({ h, m }, idx) => {
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);
        return (
          <div
            key={idx}
            style={{ height: SLOT_HEIGHT }}
            className={`border-b ${m === 30 ? "border-dashed" : ""} hover:bg-primary/5 cursor-pointer transition`}
            onClick={() => onClickSlot(barber.id, slotStart)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/appt");
              if (id) onDropAppt(id, barber.id, slotStart);
            }}
          />
        );
      })}

      {appts.map((a) => {
        const start = parseISO(a.starts_at);
        const end = parseISO(a.ends_at);
        const startMin = start.getHours() * 60 + start.getMinutes() - HOURS[0] * 60;
        const dur = (end.getTime() - start.getTime()) / 60000;
        const top = (startMin / SLOT_MIN) * SLOT_HEIGHT;
        const height = Math.max(20, (dur / SLOT_MIN) * SLOT_HEIGHT - 2);
        const color = barberColors[a.barber_id] ?? barber.color;
        return (
          <div
            key={a.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/appt", a.id)}
            onClick={(e) => { e.stopPropagation(); onClickAppt(a); }}
            className={`absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 text-xs cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition overflow-hidden ${STATUS_STYLE[a.status]}`}
            style={{ top, height, borderLeftColor: color }}
          >
            <div className="font-semibold truncate">{format(start, "HH:mm")} · {a.notes?.split("\n")[0] || STATUS_LABEL[a.status]}</div>
            <div className="text-[10px] opacity-80 truncate">{STATUS_LABEL[a.status]}</div>
          </div>
        );
      })}
    </div>
  );
}

function ApptDialog({
  open, appt, barbers, services, clients, onClose, onSave, onDelete, onStatus,
}: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (open) setForm({
      id: appt?.id, barber_id: appt?.barber_id ?? barbers[0]?.id ?? "",
      client_id: appt?.client_id ?? "", service_id: appt?.service_id ?? "",
      starts_at: appt?.starts_at ? format(parseISO(appt.starts_at), "yyyy-MM-dd'T'HH:mm") : "",
      status: appt?.status ?? "scheduled", notes: appt?.notes ?? "",
    });
  }, [open, appt, barbers]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Editar agendamento" : "Novo agendamento"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Barbeiro</Label>
            <Select value={form.barber_id} onValueChange={(v) => setForm({ ...form, barber_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{barbers.map((b: Barber) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem cliente —</SelectItem>
                {clients.map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serviço</Label>
            <Select value={form.service_id || "none"} onValueChange={(v) => setForm({ ...form, service_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem serviço —</SelectItem>
                {services.map((s: Service) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.duration_minutes}min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {form.id ? (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(form.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={!form.barber_id || !form.starts_at}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
