# Team Management System - Integration Guide

## Rápida Integração

Este guia cobre como integrar o novo Sistema de Gestão de Equipe em suas pages existentes.

## 1. Adicionar Link para Funcionários em Barbeiros.tsx

Se você gerencia barbeiros em `/dashboard/barbeiros`, pode adicionar um link para o novo sistema:

```typescript
// src/pages/dashboard/Barbeiros.tsx
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Barbeiros() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Barbeiros</h1>
        <Link to="/dashboard/funcionarios">
          <Button variant="outline">
            Gerenciar Funcionários Completo
          </Button>
        </Link>
      </div>
      {/* rest of component */}
    </div>
  );
}
```

## 2. Integrar Comissões em Vendas.tsx

Quando criando/editando venda, selecione o funcionário/barbeiro:

```typescript
// src/pages/dashboard/Vendas.tsx
import { useEmployeesList } from "@/hooks/useEmployees";

export default function Vendas() {
  const { data: employees } = useEmployeesList(ownerId);
  
  return (
    <div>
      <select name="employee_id">
        {employees?.map(emp => (
          <option key={emp.id} value={emp.id}>
            {emp.name} ({emp.position})
          </option>
        ))}
      </select>
    </div>
  );
}
```

## 3. Mostrar Comissão Pendente no Dashboard

Para mostrar comissões pendentes do funcionário logado:

```typescript
// src/pages/dashboard/DashboardHome.tsx
import { useEmployee } from "@/contexts/EmployeeContext";
import { usePayrollByPeriod } from "@/hooks/useEmployees";

export default function DashboardHome() {
  const { user } = useAuth();
  const { permissions } = useEmployee();
  
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const { data: payroll } = usePayrollByPeriod(
    ownerId,
    user?.id,
    monthStart,
    today
  );
  
  const pending = payroll?.reduce((sum, entry) => 
    entry.paid ? sum : sum + entry.commission_amount, 0) || 0;
  
  return (
    <div>
      {/* Show pending commission card */}
      <Card>
        <p>Comissão Pendente</p>
        <h3>R$ {pending.toFixed(2)}</h3>
      </Card>
    </div>
  );
}
```

## 4. Adicionar Gerente como Aprovador de Vendas

Criar rota que permite gerentes revisar/aprovar vendas:

```typescript
// src/pages/dashboard/VendasApproval.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";

export default function VendasApproval() {
  const { permissions } = useStaffRole();
  const [sales, setSales] = useState([]);
  
  // Apenas gerentes podem ver
  if (!permissions.can_manage_stock) return null;
  
  const load = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*, employees(name)')
      .eq('status', 'pending');
    setSales(data || []);
  };
  
  return (
    <div>
      <h1>Aprovar Vendas</h1>
      {sales.map(sale => (
        <div key={sale.id}>
          <p>{sale.employees.name}</p>
          <p>R$ {sale.total}</p>
          <button onClick={() => approveSale(sale.id)}>Aprovar</button>
        </div>
      ))}
    </div>
  );
}
```

## 5. Relatório de Desempenho por Funcionário

Criar dashboard de KPIs por funcionário:

```typescript
// src/pages/dashboard/PerformanceReport.tsx
import { useEmployeesList } from "@/hooks/useEmployees";
import { usePayrollByPeriod } from "@/hooks/useEmployees";

export default function PerformanceReport() {
  const { data: employees } = useEmployeesList(ownerId);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Cargo</th>
            <th>Total Vendas</th>
            <th>Comissão Gerada</th>
            <th>Meta %</th>
          </tr>
        </thead>
        <tbody>
          {employees?.map(emp => {
            const { data: payroll } = usePayrollByPeriod(
              ownerId, emp.id, startDate, endDate
            );
            const totalGross = payroll?.reduce((s, p) => s + p.gross_amount, 0);
            const totalComm = payroll?.reduce((s, p) => s + p.commission_amount, 0);
            
            return (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.position}</td>
                <td>R$ {totalGross}</td>
                <td>R$ {totalComm}</td>
                <td>{((totalComm / totalGross) * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

## 6. Sistema de Abonos e Descontos

Adicionar abonos ou descontos manualmente à folha:

```typescript
// src/components/PayrollAdjustment.tsx
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PayrollAdjustment({ employeeId }) {
  const { toast } = useToast();
  const [type, setType] = useState('bonus'); // ou 'discount'
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  
  const add = async () => {
    const { error } = await supabase
      .from('payroll_entries')
      .insert({
        employee_id: employeeId,
        entry_type: type,
        commission_amount: type === 'bonus' ? amount : -amount,
        description: reason,
        reference_date: new Date().toISOString().split('T')[0],
      });
    
    if (error) return toast({ title: "Erro", variant: "destructive" });
    toast({ title: "Adicionado com sucesso" });
  };
  
  return (
    <div className="space-y-4">
      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="bonus">Bônus</option>
        <option value="discount">Desconto</option>
      </select>
      <input
        type="number"
        placeholder="Valor"
        value={amount}
        onChange={e => setAmount(parseFloat(e.target.value))}
      />
      <input
        type="text"
        placeholder="Motivo"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <button onClick={add}>Adicionar</button>
    </div>
  );
}
```

## 7. Notificações de Comissão Pendente

Enviar notificação quando há comissão pronta para pagamento:

```typescript
// src/hooks/useCommissionReminder.ts
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePayrollByPeriod } from "./useEmployees";

export function useCommissionReminder(employeeId: string, ownerId: string) {
  const { toast } = useToast();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const { data: payroll } = usePayrollByPeriod(
    ownerId, employeeId, monthStart, today
  );
  
  useEffect(() => {
    const pending = payroll?.filter(p => !p.paid) || [];
    if (pending.length > 0) {
      const total = pending.reduce((s, p) => s + p.commission_amount, 0);
      toast({
        title: "Comissão Pendente",
        description: `Você tem R$ ${total.toFixed(2)} em comissões a receber`,
      });
    }
  }, [payroll]);
}
```

## 8. Migração de Dados Existentes

Se você tem dados de barbeiros em outra tabela, migre assim:

```sql
-- Insert barbeiros existentes em employees
INSERT INTO employees (
  owner_id, name, email, phone, position, 
  salary_type, hire_date, active, commission_enabled,
  service_commission_percent, product_commission_percent
)
SELECT
  barbershop_id,
  name,
  email,
  phone,
  'barbeiro' as position,
  'commission' as salary_type,
  created_at as hire_date,
  active,
  commission_enabled,
  service_commission_percent,
  product_commission_percent
FROM barbers
WHERE barbershop_id IS NOT NULL;
```

## 9. Hooks Úteis para Components

```typescript
// Exemplo: Component que lista comissões de barbeiro
import { usePayrollEntries } from "@/hooks/useEmployees";

export default function BarberCommissions({ barberId }) {
  const { data: entries } = usePayrollEntries(barberId);
  
  const pending = entries?.filter(e => !e.paid) || [];
  const paid = entries?.filter(e => e.paid) || [];
  
  return (
    <div>
      <h3>Pendente: R$ {pending.reduce((s, e) => s + e.commission_amount, 0)}</h3>
      <h3>Pago: R$ {paid.reduce((s, e) => s + e.commission_amount, 0)}</h3>
    </div>
  );
}
```

## 10. Environment Variables

Nenhuma nova variável necessária, mas verifique:

```env
# .env
VITE_SUPABASE_URL=seu-url
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave
```

## Troubleshooting

### Permissões não funcionam
- Verifique RLS policies em Supabase
- Ensure EmployeeProvider está wrapping seu app
- Check que user_id está correto em auth.users

### Comissões não aparecem
- Verify `commission_enabled = true` em employee
- Check trigger foi executado após venda
- Check `service_commission_configs` tem valores

### Payroll vazio
- Filtro de datas pode estar errado
- employee_id precisa existir em employees table
- Check reference_date está no range

## Support

Questões? Consulte:
- TEAM_MANAGEMENT.md - Documentação completa
- COMMISSION_SYSTEM.md - Sistema de comissões integrado
- Schema explorer no Supabase dashboard
