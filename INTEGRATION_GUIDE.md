# Guia de Integração - Sistema de Comissionamento

Este documento mostra como integrar o sistema de comissionamento nas páginas existentes do Barber On.

## 1. Integração com Página de Vendas

### Objetivo
Quando registrar uma venda/serviço, selecionar qual barbeiro realizou e gerar comissão automaticamente.

### Implementação

#### Passo 1: Importar componentes necessários

```tsx
// Em pages/dashboard/Vendas.tsx
import { BarberSelectionInSales } from "@/components/AppointmentCompletion";
import { BarberSelector } from "@/components/BarberSelector";
import { useAuth } from "@/contexts/AuthContext";
```

#### Passo 2: Adicionar state para barbeiro selecionado

```tsx
const [selectedBarberId, setSelectedBarberId] = useState<string>("");
const { user } = useAuth();
```

#### Passo 3: Adicionar seletor de barbeiro no formulário

```tsx
<form onSubmit={handleSaveVenda}>
  {/* Campos existentes de venda */}
  <input type="text" placeholder="Cliente" />
  <input type="number" placeholder="Valor" />
  
  {/* Novo: Seletor de Barbeiro */}
  <BarberSelector
    value={selectedBarberId}
    onChange={setSelectedBarberId}
    label="Qual barbeiro realizou o serviço?"
    required
  />
  
  <button type="submit">Salvar Venda</button>
</form>
```

#### Passo 4: Ao salvar venda, enviar barber_id

```tsx
const handleSaveVenda = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedBarberId) {
    alert("Selecione um barbeiro");
    return;
  }

  // Salvar venda com barber_id
  const { error } = await supabase
    .from("sales")
    .insert({
      owner_id: user?.id,
      barber_id: selectedBarberId,  // ← Importante!
      client_id: selectedClientId,
      appointment_id: selectedAppointmentId,
      total: saleAmount,
      payment_method: paymentMethod,
      status: "paid",
    });

  if (!error) {
    // Comissão será gerada automaticamente pelo trigger
    alert("Venda salva! Comissão gerada automaticamente.");
    // Limpar formulário
    setSelectedBarberId("");
  }
};
```

---

## 2. Integração com Página de Agendamentos

### Objetivo
Quando marcar um agendamento como "concluído", gerar comissão para o barbeiro.

### Implementação

#### Opção A: Usar Componente Modal (Recomendado)

```tsx
// Em pages/dashboard/Agenda.tsx
import { CompleteAppointmentModal } from "@/components/AppointmentCompletion";
import { useState } from "react";

export default function Agenda() {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const handleCompleteAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowCompleteModal(true);
  };

  return (
    <>
      {/* Tabela/Lista de agendamentos */}
      {appointments.map((apt) => (
        <div key={apt.id}>
          <span>{apt.client_name}</span>
          <span>{apt.service_name}</span>
          <span>{apt.service_price}</span>
          <button 
            onClick={() => handleCompleteAppointment(apt)}
            className="btn-primary"
          >
            Concluir
          </button>
        </div>
      ))}

      {/* Modal para confirmar conclusão e gerar comissão */}
      <CompleteAppointmentModal
        isOpen={showCompleteModal}
        appointmentId={selectedAppointment?.id}
        ownerId={user?.id}
        servicePrice={selectedAppointment?.service_price}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={() => {
          // Recarregar agendamentos após conclusão
          refetchAppointments();
        }}
      />
    </>
  );
}
```

#### Opção B: Usar Função Direta

```tsx
// Se preferir executar sem modal
import { useCreateCommissionFromAppointment } from "@/hooks/useAppointmentCommissions";

const createCommission = useCreateCommissionFromAppointment();

const handleCompleteWithComission = async (appointment: any) => {
  try {
    await createCommission.mutateAsync({
      appointmentId: appointment.id,
      barberId: appointment.barber_id,
      ownerId: user?.id,
      grossAmount: appointment.service_price,
    });
    
    // Depois atualizar status do agendamento
    await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointment.id);
    
  } catch (error) {
    console.error("Erro:", error);
  }
};
```

---

## 3. Dashboard do Barbeiro

### Objetivo
Barbeiro visualizar suas comissões.

### Implementação

Adicionar rota na página de dashboard:

```tsx
// Em pages/dashboard/DashboardLayout.tsx ou App.tsx
import BarberCommissions from "./pages/dashboard/BarberCommissions";

// Adicionar rota
<Route path="comissoes" element={<BarberCommissions />} />
```

---

## 4. Gerenciamento de Comissões (Dono)

### Objetivo
Dono gerenciar e visualizar comissões.

### Implementação

Adicionar rota:

```tsx
import CommissionManagement from "./pages/dashboard/CommissionManagement";

<Route path="comissoes-manager" 
  element={<PermissionRoute ownerOnly><CommissionManagement /></PermissionRoute>} />
```

---

## 5. Exemplo Completo: Página de Vendas com Barbeiro

```tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarberSelector } from "@/components/BarberSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function Vendas() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    client_id: "",
    appointment_id: "",
    barber_id: "", // ← Nova field
    total: 0,
    payment_method: "cash",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.barber_id) {
      alert("Selecione um barbeiro");
      return;
    }

    const { error } = await supabase.from("sales").insert({
      owner_id: user?.id,
      ...formData,
    });

    if (error) {
      alert("Erro ao salvar venda: " + error.message);
    } else {
      alert("Venda salva! Comissão gerada automaticamente.");
      // Limpar formulário
      setFormData({
        client_id: "",
        appointment_id: "",
        barber_id: "",
        total: 0,
        payment_method: "cash",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Nova Venda</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Cliente</label>
            <Input
              type="text"
              placeholder="Nome do cliente"
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
            />
          </div>

          <div>
            <label>Valor</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.total}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total: parseFloat(e.target.value),
                })
              }
            />
          </div>

          {/* ← Novo componente */}
          <BarberSelector
            value={formData.barber_id}
            onChange={(id) => setFormData({ ...formData, barber_id: id })}
            label="Qual barbeiro realizou o serviço?"
          />

          <div>
            <label>Método de Pagamento</label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payment_method: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
              <option value="pix">PIX</option>
            </select>
          </div>

          <Button type="submit" className="w-full">
            Salvar Venda
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

---

## 6. Verificar Comissões Geradas

### Para Barbeiro Ver Suas Comissões

```tsx
import { useBarberCommissions } from "@/hooks/useCommissions";
import { useBarber } from "@/contexts/BarberContext";

export function BarberCommissionsList() {
  const { barber } = useBarber();
  const { data: commissions = [] } = useBarberCommissions(barber?.id || "");

  return (
    <div>
      <h2>Minhas Comissões</h2>
      {commissions.map((commission) => (
        <div key={commission.id}>
          <p>
            {commission.commission_type}: R${" "}
            {commission.commission_amount.toFixed(2)}
          </p>
          <p>Status: {commission.paid ? "Pago" : "Pendente"}</p>
        </div>
      ))}
    </div>
  );
}
```

### Para Dono Ver Comissões de Todos

```tsx
import { useBarbershipCommissionsSummary } from "@/hooks/useCommissions";
import { useAuth } from "@/contexts/AuthContext";

export function BarbershopCommissionsSummary() {
  const { user } = useAuth();
  const { data: summary = [] } = useBarbershipCommissionsSummary(user?.id || "");

  return (
    <div>
      <h2>Comissões dos Barbeiros</h2>
      {summary.map((barber) => (
        <div key={barber.barber_id}>
          <h3>{barber.barber_name}</h3>
          <p>Pendente: R$ {barber.pending_commission.toFixed(2)}</p>
          <p>Pago: R$ {barber.paid_commission.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Fluxo Resumido

```
1. Usuário registra Venda
   ↓
2. Seleciona Barbeiro
   ↓
3. Salva venda com barber_id
   ↓
4. Trigger automático execute calculate_commission_on_sale()
   ↓
5. Comissão é criada em commissions_generated
   ↓
6. Barbeiro vê em "Minhas Comissões"
   ↓
7. Dono vê em "Gerenciar Comissões"
```

---

## Troubleshooting

### Comissão não está sendo gerada
1. ✅ Verifique se `barber_id` foi preenchido na venda
2. ✅ Verifique se `commission_enabled = true` para o barbeiro
3. ✅ Verifique se o percentual está configurado (> 0)
4. ✅ Verifique se o trigger está ativo no banco

### Barbeiro não vê comissões
1. ✅ Verifique se está logado como barbeiro
2. ✅ Verifique se `user_id` está preenchido na tabela barbers
3. ✅ Cheque as políticas RLS

### Valores incorretos
1. ✅ Verifique percentual de comissão
2. ✅ Use `console.log()` para debugar valores
3. ✅ Verifique se há configuração específica por serviço sobrescrevendo

