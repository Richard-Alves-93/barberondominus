# Sistema de Barbeiros e Comissionamento - Barber On

## 📋 Visão Geral

Este sistema implementa um modelo robusto de gerenciamento de barbeiros e comissionamento para o Barber On, permitindo que:

1. **Barbeiros** visualizem suas comissões e rendimentos
2. **Donos da Barbearia** configurem e gerenciem comissões de seus barbeiros
3. **Admin Master** mantenha visibilidade sobre o faturamento bruto (para cálculo da taxa Master)

## 🏗️ Arquitetura do Sistema

### Tabelas do Banco de Dados

#### 1. `barbers` (atualizada)
Agora inclui campos de comissão:
- `commission_enabled` (boolean) - Habilita/desabilita comissão
- `service_commission_percent` (numeric) - % de comissão sobre serviços
- `product_commission_percent` (numeric) - % de comissão sobre produtos
- `user_id` (uuid) - Vincula barbeiro ao usuário do app

#### 2. `service_commission_configs` (nova)
Configurações de comissão específicas por serviço e barbeiro
- `owner_id` - ID do dono da barbearia
- `service_id` - ID do serviço
- `barber_id` - ID do barbeiro
- `commission_percent` - Percentual específico
- Permite comissões diferentes por tipo de serviço

#### 3. `commissions_generated` (nova)
Registro de comissões geradas
- `barber_id` - Qual barbeiro recebeu a comissão
- `sale_id` - ID da venda relacionada
- `appointment_id` - ID do agendamento relacionado
- `commission_type` - Tipo (service, product, appointment)
- `gross_amount` - Valor bruto
- `commission_percent` - Percentual aplicado
- `commission_amount` - Valor calculado
- `paid` - Se foi pago ou não
- `paid_at` - Data do pagamento

### Funções RLS (Row Level Security)

O sistema implementa políticas que garantem:

- **Barbeiros** só veem seus próprios agendamentos e comissões
- **Barbeiros** veem apenas clientes que já atenderam
- **Donos** veem todos os dados da sua barbearia
- **Admins** veem dados globais

## 🎯 Funcionalidades

### 1. Permissões de Barbeiro

#### Barbeiro pode acessar:
- ✅ Sua própria agenda
- ✅ Lista de clientes que atendeu
- ✅ Suas comissões geradas
- ✅ Dashboard de comissões

#### Barbeiro NÃO pode acessar:
- ❌ Faturamento total da barbearia
- ❌ Estoque
- ❌ Dados de outros barbeiros
- ❌ Configurações gerais

### 2. Sistema de Comissões

#### Configuração (Dono)
```
Dono → Gerenciar Comissões → Seleciona Barbeiro → Define:
  - Comissão sobre Serviços (ex: 50%)
  - Comissão sobre Produtos (ex: 10%)
  - Toggle para habilitar/desabilitar
  - (Opcional) Comissão por tipo de serviço específico
```

#### Cálculo Automático
Quando uma venda é registrada:
1. Sistema verifica se barbeiro tem comissão habilitada
2. Busca percentual específico por serviço (se existir)
3. Calcula: `Comissão = Valor_Venda × Percentual / 100`
4. Registra em `commissions_generated`

#### Fórmula para Faturamento Master
```
Faturamento Bruto Total = Todas as vendas (sem descontar comissões)
Taxa Master = Faturamento Bruto × Percentual (3-5%)
Valor para Donos = Faturamento Bruto - Comissões_Barbeiros - Taxa_Master
```

### 3. Dashboard do Barbeiro

Mostra:
- 💰 **A Receber** - Total de comissões pendentes
- 📊 **Faturamento** - Total bruto de serviços
- 📈 **Taxa de Comissão** - Percentual configurado
- 📋 **Comissões Recentes** - Últimas comissões geradas

### 4. Gerenciamento de Comissões (Dono)

#### Aba "Gerenciar Comissões"
- Visão de todos os barbeiros
- Total pendente por barbeiro
- Botão para configurar comissão individual
- Resumo geral de comissões

#### Aba "Relatório de Período"
- Filtrar por barbeiro e período
- Ver: Faturamento Bruto, Comissão, Valor Líquido
- Quantidade de comissões pagas/pendentes

## 🔧 Como Usar

### Para o Dono

#### 1. Configurar Comissão de um Barbeiro
```
Dashboard → Gerenciar Comissões → Selecione Barbeiro → Clique em ⚙️
- Habilite comissão
- Defina % sobre serviços (ex: 50%)
- Defina % sobre produtos (ex: 10%)
- Salve
```

#### 2. (Opcional) Comissão por Serviço
Para alguns serviços terem comissão diferente, será necessário criar entries na tabela `service_commission_configs`. Isso pode ser feito via API.

#### 3. Ver Relatório de Comissões
```
Dashboard → Gerenciar Comissões → Aba "Relatório de Período"
- Selecione barbeiro
- Escolha período
- Veja faturamento, comissões e valor líquido
```

### Para o Barbeiro

#### 1. Ver Minhas Comissões
```
Dashboard → Minhas Comissões
- Veja quanto tem a receber
- Liste todas as comissões geradas
- Status: Pendente ou Pago
```

## 📊 Exemplo de Cálculo

### Cenário: Barbeiro Felipe com comissão de 50%

**Venda de Serviço:**
- Valor do Corte: R$ 100,00
- Comissão: 50% × R$ 100 = **R$ 50,00**
- Registrado em: `commissions_generated`

**Múltiplas Vendas no Dia:**
- Corte 1: R$ 100 → Comissão: R$ 50
- Corte 2: R$ 80 → Comissão: R$ 40
- Produto: R$ 50 (10% comissão) → Comissão: R$ 5
- **Total Faturado:** R$ 230
- **Total Comissão:** R$ 95

**Relatório para Dono:**
- Faturamento Bruto: R$ 230
- Comissão do Felipe: R$ 95
- Valor Líquido (para a casa): R$ 135

### Faturamento Master

Se a barbearia tem plano Master com 5%:

```
Faturamento Bruto Total: R$ 10.000
Taxa Master (5%): R$ 500
Total Comissões Barbeiros: R$ 3.000
Valor Líquido para o Dono: R$ 6.500

Distribuição:
- Barber On (5% do bruto): R$ 500
- Barbeiros: R$ 3.000
- Dono: R$ 6.500
```

## 🔌 Integração com Vendas

### Ao registrar uma venda:

```typescript
// Quando criar uma venda:
1. Usuário seleciona barbeiro (via BarberSelector)
2. Venda é registrada com barber_id
3. Trigger automático executa calculate_commission_on_sale()
4. Comissão é criada em commissions_generated
```

### Componente BarberSelector

Componente reutilizável para seleção de barbeiro:

```tsx
<BarberSelector
  value={selectedBarberId}
  onChange={(id) => setSelectedBarberId(id)}
  label="Qual barbeiro realizou o serviço?"
  required
/>
```

## 🔐 Segurança e RLS

### Policies Implementadas

1. **Barbeiros só veem seus dados:**
   - Agendamentos: `barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())`
   - Comissões: `barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())`

2. **Clientes:** Barbeiro vê apenas clientes que atendeu
   - Relacionamento através de agendamentos

3. **Donos:** Veem todos os dados da barbearia

4. **Admins:** Veem dados globais para auditoria

## 📱 Componentes Principais

### BarberCommissionDashboard
Dashboard para barbeiro ver suas comissões

### BarberCommissionManager
Interface para dono gerenciar comissões de barbeiros

### CommissionReportByPeriod
Relatório com período customizável

### BarberSelector
Selector para escolher barbeiro ao registrar vendas

## 🛠️ Hooks Disponíveis

### useBarber()
```typescript
const { barber, isBarber, commissionSummary, refreshBarber } = useBarber();
```

### useBarberCommissions(barberId)
```typescript
const { data: commissions } = useBarberCommissions(barberId);
```

### useBarbershipCommissionsSummary(ownerId)
```typescript
const { data: summary } = useBarbershipCommissionsSummary(ownerId);
```

### useCommissionsByPeriod(barberId, startDate, endDate)
```typescript
const { data: periodData } = useCommissionsByPeriod(barberId, startDate, endDate);
```

### useUpdateCommissionConfig()
```typescript
const mutation = useUpdateCommissionConfig();
mutation.mutateAsync({
  barberId: "...",
  serviceCommissionPercent: 50,
  productCommissionPercent: 10,
  commissionEnabled: true,
});
```

## 🧮 Funções Utilitárias (lib/commissions.ts)

```typescript
// Calcular comissão
calculateCommission(100, 50); // { grossAmount: 100, commissionPercent: 50, commissionAmount: 50 }

// Calcular valor líquido
calculateNetAmount(100, 50); // 50

// Calcular múltiplas comissões
calculateBulkCommissions([
  { grossAmount: 100, commissionPercent: 50 },
  { grossAmount: 80, commissionPercent: 50 },
]);

// Calcular taxa Master
calculateMasterFee(10000, 5); // 500

// Distribuição de receita
calculateRevenueDistribution(10000, 3000, 5);
```

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Comprovante de Comissões** - Gerar PDF para barbeiro
2. **Integração com Pagamento** - PIX/Transferência automática
3. **Histórico de Comissões** - Arquivo de comissões pagas
4. **Alertas** - Notificar quando comissão atingir limite
5. **Descontos Especiais** - Permitir comissões progressivas

### Roadmap

- [ ] Exportar comissões em Excel
- [ ] Dashboard com gráficos de tendência
- [ ] Previsão de ganhos do barbeiro
- [ ] Relatório para contador/fiscal

## 📞 Suporte

Para dúvidas ou problemas com o sistema de comissões:
1. Verifique se barbeiro tem `commission_enabled = true`
2. Confirme que vendas têm `barber_id` preenchido
3. Verifique as queries nas funções RLS
