# Sistema de Gestão de Equipe - Barber On

## 📋 Visão Geral

O módulo de Gestão de Equipe (Team Management) oferece controle completo sobre funcionários, permissões e remuneração variável. Sistema integrado com o módulo de comissões para cálculo automático de pagamentos.

## 🎯 Funcionalidades

### 1. Registro de Funcionários
- **Criar novo funcionário**: Nome, Email, Telefone, Cargo, Tipo de Salário
- **Posições disponíveis**: Admin, Gerente, Atendente, Barbeiro
- **Tipos de salário**: Fixo, Comissão, Híbrido
- **Data de contratação**: Rastreamento automático
- **Soft delete**: Marcação de data de término sem deletar histórico

### 2. Controle de Acesso (Permissões)

Cada posição tem um conjunto de permissões específicas:

#### Admin
- ✅ Todas as 12 permissões ativas
- Acesso completo ao sistema

#### Gerente (Gerente de Barbearia)
- ✅ Acessar PDV/Vendas
- ✅ Acessar Agenda
- ✅ Ver Clientes
- ✅ Gerenciar Clientes
- ✅ Criar Vendas
- ✅ Ver Vendas
- ✅ Ver Serviços
- ✅ Gerenciar Estoque
- ✅ Ver Relatórios
- ❌ Gerenciar Folha de Pagamento
- ❌ Gerenciar Plano Master
- ❌ Gerenciar Equipe

#### Atendente (Recepção/Vendedor)
- ✅ Ver Clientes
- ✅ Gerenciar Clientes
- ✅ Criar Vendas
- ✅ Ver Vendas
- ✅ Ver Estoque
- ❌ Acessar PDV (operações avançadas)
- ❌ Acessar Agenda
- ❌ Ver/Criar Serviços
- ❌ Gerenciar Estoque
- ❌ Ver Relatórios
- ❌ Gerenciar Pagamentos
- ❌ Gerenciar Equipe

#### Barbeiro
- ❌ Sem acesso a funcionalidades administrativas
- Acesso apenas aos dados próprios (compromissos, comissões)
- Sistema de comissões automático

### 3. Remuneração Variável

#### Para Barbeiros
- **Comissão por Serviços**: % calculado sobre valor de serviços
- **Comissão por Produtos**: % calculado sobre venda de produtos
- **Ativação Dinâmica**: Toggle "Habilitar Comissão" por barbeiro
- **Cálculo Automático**: Trigger PostgreSQL gera payroll_entries ao completar venda

#### Integração com Comissões
- Sistema usa mesma tabela `service_commission_configs`
- Valores sincronizados entre módulos
- Relatórios unificados de receita e comissões

### 4. Folha de Pagamento
- **Filtros**: Por funcionário, período, data específica
- **Resumo**: Faturamento bruto, total comissões, pendente
- **Detalhes**: Breakdown de serviços vs. produtos
- **Status**: Pendente ou Pago
- **Ação**: Marcar múltiplos como pagos em uma operação

## 🏗️ Arquitetura

### Context (State Management)
```typescript
// src/contexts/EmployeeContext.tsx
- EmployeeProvider (wrapper global)
- useEmployee hook (acesso a permissões do usuário)
- getPermissionsByPosition() (mapping posição → permissões)
```

### Hooks (Data Operations)
```typescript
// src/hooks/useEmployees.ts
- useEmployeesList(ownerId)          // Listar funcionários ativos
- useCreateEmployee()                // Registrar novo funcionário
- useUpdateEmployee()                // Editar dados
- useDeactivateEmployee()            // Desativar (soft delete)
- usePayrollByPeriod(...)            // RPC para payroll agregado
- usePayrollEntries(employeeId)      // Histórico de pagamentos
- useMarkPayrollAsPaid()             // Marcar como pago
```

### Componentes
```typescript
// src/components/EmployeeManagement.tsx
- Lista de funcionários com badges (posição, tipo salário)
- Dialog para criar novo funcionário
- Formulário com campos condicionais:
  - Se Barbeiro: mostra toggles de comissão + % serviços/produtos
  - Se não-Barbeiro: oculta campos de comissão
- Ações: Editar, Deletar

// src/components/PayrollReport.tsx
- Filtro: Funcionário, Data início/fim
- Resumo: Cards de Faturamento, Comissões, Pendente
- Tabela detalhada com breakdown
- Ação: Marcar como pago (bulk)
```

### Pages
```typescript
// src/pages/dashboard/Employees.tsx
Wrapper que renderiza <EmployeeManagement />

// src/pages/dashboard/Payroll.tsx
Wrapper que renderiza <PayrollReport />
```

### Database Schema

#### Tabela: employees
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position ENUM('admin'|'gerente'|'atendente'|'barbeiro'),
  salary_type ENUM('fixed'|'commission'|'hybrid'),
  base_salary DECIMAL,
  commission_enabled BOOLEAN DEFAULT false,
  service_commission_percent DECIMAL,
  product_commission_percent DECIMAL,
  active BOOLEAN DEFAULT true,
  hire_date DATE,
  termination_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Tabela: payroll_entries
```sql
CREATE TABLE payroll_entries (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES employees(id),
  sale_id UUID REFERENCES sales(id),
  appointment_id UUID REFERENCES appointments(id),
  entry_type TEXT ('service'|'product'),
  gross_amount DECIMAL,
  commission_percent DECIMAL,
  commission_amount DECIMAL,
  description TEXT,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP,
  payment_method TEXT,
  reference_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### RLS Policies

**Employees Table**:
- Owners gerenciam todos os funcionários
- Funcionários veem apenas seus próprios dados
- Admins veem todos

**Payroll Entries**:
- Owners veem/gerenciam todos os pagamentos
- Funcionários veem apenas seus próprios pagamentos
- Admins veem tudo

### Database Functions

#### RPC: get_payroll_summary_by_period
```sql
Parameters:
  p_owner_id UUID
  p_start_date DATE
  p_end_date DATE
  p_employee_id UUID (optional)

Returns:
  employee_id, name, position, reference_date,
  gross_amount, commission_percent, commission_amount,
  entry_type, paid, paid_at
```

#### Trigger: trg_calculate_employee_commission_on_sale
- Executado ao inserir venda
- Verifica se vendedor é barbeiro com comissão ativa
- Cria payroll_entry com comissão calculada
- Usa valores de service_commission_configs

## 🔄 Fluxo de Dados

### Criar Funcionário
1. User clica "Novo Funcionário" em EmployeeManagement
2. Dialog abre com form
3. Submit: `useCreateEmployee()`
4. React Query mutation envia para `supabase.from('employees').insert()`
5. RLS verifica owner_id do usuário
6. Funcionário criado e lista recarrega

### Comissionar Barbeiro
1. Owner em EmployeeManagement, edita Barbeiro
2. Ativa toggle "Habilitar Comissão"
3. Define % Serviços e % Produtos
4. Submit: `useUpdateEmployee()`
5. Valores salvos em `commission_enabled`, `service_commission_percent`, `product_commission_percent`
6. Quando venda criada → trigger cria payroll_entry automático

### Visualizar Folha de Pagamento
1. Owner acessa /dashboard/folha-pagamento
2. PayrollReport carrega com filtros padrão
3. Seleciona Funcionário e Data
4. Submit: `usePayrollByPeriod()` → RPC executada
5. Retorna resumo + tabela detalhada
6. Ação "Marcar como Pago": `useMarkPayrollAsPaid()` marca múltiplos

## 🔐 Controle de Acesso

### No App.tsx
```typescript
<Route path="funcionarios" element={
  <PermissionRoute ownerOnly>
    <Employees />
  </PermissionRoute>
} />

<Route path="folha-pagamento" element={
  <PermissionRoute ownerOnly>
    <Payroll />
  </PermissionRoute>
} />
```

### No AppSidebar.tsx
```typescript
{isOwner && (
  <>
    <NavLink link="/dashboard/funcionarios" icon={Users2} label="Funcionários" />
    <NavLink link="/dashboard/folha-pagamento" icon={CreditCard} label="Folha de Pagamento" />
  </>
)}
```

## 🚀 Implantação

### 1. Deploy Migrations
```bash
# Execute no Supabase SQL Editor, em ordem:
1. supabase/migrations/20260515000003_team_management_system.sql
2. supabase/migrations/20260515000004_team_permissions_rls.sql
```

### 2. Build & Deploy Frontend
```bash
npm run build
# Deploy para Vercel/Netlify/seu servidor
```

### 3. Testes Essenciais
- [ ] Login como Owner → Ver seções Funcionários e Folha
- [ ] Login como Gerente → Ver Funcionários mas NOT Folha?
- [ ] Login como Atendente → NOT ver nenhuma seção
- [ ] Login como Barbeiro → NOT ver nenhuma seção
- [ ] Criar Barbeiro com comissão ativa
- [ ] Completar venda → Verificar payroll_entry criada
- [ ] Visualizar folha de pagamento com filtro

## 📊 Integrações

### Com Sistema de Comissões
- Usa mesma tabela `service_commission_configs`
- Trigger `trg_calculate_employee_commission_on_sale` cria payroll_entries
- BarberContext compatível com novo sistema

### Com Relatórios
- PayrollReport oferece export-ready data
- Formato compatível com contadores/RH
- Histórico completo de pagamentos

### Com Vendas
- Ao criar venda, trigger verifica vendedor
- Se barbeiro com comissão: cria payroll_entry
- Se gerente/atendente: sem comissão automática

## ❓ FAQ

**P: Pode um funcionário ter múltiplas posições?**
A: Não, 1 funcionário = 1 posição. Criar múltiplas registros se necessário.

**P: Posso mudar posição de um funcionário?**
A: Sim, edit employee e mude o campo position.

**P: Dados históricos quando deletar funcionário?**
A: Soft delete preserva histórico. Use termination_date.

**P: Comissão de barbeiro é automática?**
A: Sim, trigger PostgreSQL cria payroll_entry ao salvar venda com barbeiro.

**P: Como exportar folha de pagamento?**
A: Copy table data ou implementar export PDF (próxima feature).

## 📝 Próximos Passos

- [ ] Export PDF de folha de pagamento
- [ ] Integração com banco para ACH/PIX
- [ ] Relatório de retenções e descontos
- [ ] Agendamento automático de pagamentos
- [ ] Dashboard de remuneração em tempo real
