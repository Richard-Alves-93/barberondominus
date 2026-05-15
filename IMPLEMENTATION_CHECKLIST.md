# ✅ Checklist de Implementação - Sistema de Comissionamento

## Fase 1: Banco de Dados ✓

- [x] Criar migration `20260515000000_barbier_commission_system.sql`
  - [x] Adicionar campos em `barbers` (commission_enabled, commission_percent, etc)
  - [x] Criar tabela `service_commission_configs`
  - [x] Criar tabela `commissions_generated`
  - [x] Criar trigger para calcular comissões automaticamente
  - [x] Criar funções RPC para consultas

- [x] Criar migration `20260515000001_barber_permissions_rls.sql`
  - [x] Adicionar políticas RLS para barbeiros
  - [x] Permitir barbeiros ver seus agendamentos
  - [x] Permitir barbeiros ver clientes atendidos
  - [x] Criar funções auxiliares para cálculos

- [x] Criar migration `20260515000002_enhanced_commission_functions.sql`
  - [x] Melhorar função de cálculo de comissão
  - [x] Criar função para comissões de agendamentos
  - [x] Criar função para marcar múltiplas comissões como pagas

**Status**: ✅ Pronto - Migrations criadas e prontas para deploy

---

## Fase 2: Backend - Contextos e Hooks ✓

- [x] Criar `src/contexts/BarberContext.tsx`
  - [x] Provider para dados do barbeiro logado
  - [x] Hook `useBarber()` para acessar dados

- [x] Criar `src/hooks/useCommissions.ts`
  - [x] Hook para carregar comissões pendentes
  - [x] Hook para atualizar configuração de comissão
  - [x] Hook para marcar comissões como pagas
  - [x] Hooks para consultas RPC

- [x] Criar `src/hooks/useBarbershop.ts`
  - [x] Hook para carregar barbeiros da barbearia
  - [x] Hook para detalhes de barbeiro específico

- [x] Criar `src/hooks/useAppointmentCommissions.ts`
  - [x] Hook para criar comissão de agendamento
  - [x] Hook para marcar múltiplas comissões como pagas

**Status**: ✅ Pronto - Todos os hooks implementados

---

## Fase 3: Componentes UI ✓

- [x] Criar `src/components/BarberCommissionDashboard.tsx`
  - [x] Dashboard para barbeiro ver comissões
  - [x] Mostrar pendente, faturamento e taxa
  - [x] Listar comissões recentes

- [x] Criar `src/components/BarberCommissionManager.tsx`
  - [x] Gerenciador para dono configurar comissões
  - [x] Formulário de comissão por barbeiro
  - [x] Resumo de comissões

- [x] Criar `src/components/CommissionReportByPeriod.tsx`
  - [x] Relatório customizável por período
  - [x] Filtros por barbeiro e datas
  - [x] Breakdown de valores

- [x] Criar `src/components/BarberSelector.tsx`
  - [x] Selector simples de barbeiro
  - [x] Multi-selector (futuro)
  - [x] Lista visual de barbeiros

- [x] Criar `src/components/AppointmentCompletion.tsx`
  - [x] Componente para finalizar agendamento
  - [x] Integração com comissões
  - [x] Modal de confirmação

**Status**: ✅ Pronto - Todos os componentes implementados

---

## Fase 4: Páginas de Dashboard ✓

- [x] Criar `src/pages/dashboard/BarberCommissions.tsx`
  - [x] Página para barbeiro ver comissões
  - [x] Integração com BarberCommissionDashboard

- [x] Criar `src/pages/dashboard/CommissionManagement.tsx`
  - [x] Página para dono gerenciar
  - [x] Tabs para gerenciar e relatórios

**Status**: ✅ Pronto - Páginas criadas

---

## Fase 5: Roteamento e Integração ✓

- [x] Atualizar `src/App.tsx`
  - [x] Importar BarberProvider
  - [x] Adicionar BarberProvider wrapper
  - [x] Adicionar rotas `/dashboard/comissoes`
  - [x] Adicionar rotas `/dashboard/comissoes-manager`
  - [x] Importar novas páginas

- [x] Atualizar `src/components/AppSidebar.tsx`
  - [x] Importar useBarber
  - [x] Adicionar ícone DollarSign
  - [x] Mostrar "Minhas Comissões" para barbeiros
  - [x] Mostrar "Gerenciar Comissões" para donos
  - [x] Adicionar links na sidebar

**Status**: ✅ Pronto - Todas as rotas configuradas

---

## Fase 6: Utilitários ✓

- [x] Criar `src/lib/commissions.ts`
  - [x] Função calculateCommission()
  - [x] Função calculateNetAmount()
  - [x] Função calculateBulkCommissions()
  - [x] Função calculateMasterFee()
  - [x] Função calculateRevenueDistribution()
  - [x] Função isValidCommissionPercent()
  - [x] Função formatCommissionAmount()

**Status**: ✅ Pronto - Todas as funções utilitárias implementadas

---

## Fase 7: Documentação ✓

- [x] Criar `COMMISSION_SYSTEM.md`
  - [x] Visão geral completa
  - [x] Tabelas e estrutura
  - [x] Funcionalidades
  - [x] Exemplos de cálculo
  - [x] Guia de uso

- [x] Criar `INTEGRATION_GUIDE.md`
  - [x] Como integrar com Vendas
  - [x] Como integrar com Agendamentos
  - [x] Exemplos de código
  - [x] Troubleshooting

- [x] Criar este checklist

**Status**: ✅ Pronto - Documentação completa

---

## Fase 8: Deploy e Testes

### Antes de fazer Deploy

- [ ] Executar migrations no Supabase
  ```sql
  -- Conectar ao Supabase e executar em ordem:
  -- 1. 20260515000000_barbier_commission_system.sql
  -- 2. 20260515000001_barber_permissions_rls.sql
  -- 3. 20260515000002_enhanced_commission_functions.sql
  ```

- [ ] Testar RLS localmente
  ```bash
  # Verificar que políticas estão funcionando
  # 1. Barbeiro só vê suas comissões
  # 2. Barbeiro só vê seus agendamentos
  # 3. Dono vê tudo
  ```

- [ ] Testar fluxo de comissão
  ```
  1. Criar venda com barber_id
  2. Verificar se comissão foi gerada
  3. Barbeiro vê comissão em Dashboard
  4. Dono vê comissão em Gerenciar Comissões
  ```

### Integração com Páginas Existentes

- [ ] Atualizar página de Vendas
  - [ ] Adicionar BarberSelector
  - [ ] Salvar barber_id na venda

- [ ] Atualizar página de Agendamentos
  - [ ] Adicionar CompleteAppointmentModal
  - [ ] Gerar comissão ao concluir

- [ ] Testar permissões
  - [ ] Barbeiro não vê outras seções
  - [ ] Dono vê tudo
  - [ ] Admin vê dados globais

### Testes End-to-End

- [ ] **Teste 1: Barbeiro recebendo comissão**
  ```
  1. Criar venda: Cliente X, R$ 100, Barbeiro Felipe
  2. Felipe vê comissão de R$ 50 (50%)
  3. Felipe vê em "Minhas Comissões"
  ```

- [ ] **Teste 2: Dono gerenciando comissões**
  ```
  1. Acessar "Gerenciar Comissões"
  2. Ver lista de barbeiros
  3. Clicar em ⚙️ para configurar
  4. Alterar % de comissão
  5. Salvar
  6. Próxima venda usa novo %
  ```

- [ ] **Teste 3: Relatório de período**
  ```
  1. Ir para "Relatório de Período"
  2. Selecionar barbeiro e período
  3. Ver faturamento, comissões e líquido
  4. Valores devem estar corretos
  ```

- [ ] **Teste 4: RLS (Segurança)**
  ```
  1. Barbeiro tenta acessar dados de outro barbeiro → Bloqueado
  2. Barbeiro tenta ver estoque → Bloqueado
  3. Barbeiro tenta ver clientes não atendidos → Bloqueado
  4. Dono acessa tudo → Permitido
  ```

---

## Próximas Melhorias (Roadmap)

- [ ] Comprovante de Comissão em PDF
- [ ] Integração PIX automático
- [ ] Comissões progressivas
- [ ] Histórico de comissões pagas
- [ ] Gráficos de tendência
- [ ] Exportar em Excel
- [ ] Alertas de comissão
- [ ] API para sistema externo de folha

---

## Troubleshooting Rápido

### ❌ Comissão não está sendo gerada

```bash
# 1. Verificar se barber_id foi salvo na venda
SELECT * FROM sales WHERE id = 'xxx' \G

# 2. Verificar se barbeiro tem comissão habilitada
SELECT * FROM barbers WHERE id = 'yyy' \G

# 3. Verificar se trigger está funcionando
SELECT * FROM commissions_generated WHERE sale_id = 'xxx' \G
```

### ❌ Barbeiro não vê suas comissões

```bash
# 1. Verificar se user_id está setado em barbers
SELECT * FROM barbers WHERE id = 'yyy' \G

# 2. Verificar se RLS está permitindo
-- Logar como barbeiro e tentar:
SELECT * FROM commissions_generated;
```

### ❌ Valores de comissão incorretos

```bash
# 1. Verificar percentual configurado
SELECT service_commission_percent FROM barbers WHERE id = 'yyy' \G

# 2. Verificar se há config específica por serviço
SELECT * FROM service_commission_configs WHERE barber_id = 'yyy' \G

# 3. Recalcular manualmente
-- Comissão = (100 * 50) / 100 = 50
```

---

## Contato para Suporte

Para dúvidas durante a implementação:
1. Verificar `COMMISSION_SYSTEM.md`
2. Verificar `INTEGRATION_GUIDE.md`
3. Revisar migrations
4. Checar políticas RLS

---

**Data de Criação**: 15 de Maio de 2026
**Status Geral**: ✅ Implementação Completa
**Próximo Passo**: Deploy em Produção
