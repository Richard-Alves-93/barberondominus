// Tipos de dados
export interface BarberCommissionConfig {
  serviceCommissionPercent: number;
  productCommissionPercent: number;
  enabled: boolean;
}

export interface CommissionCalculation {
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
}

/**
 * Calcula o valor da comissão sobre um serviço ou venda
 * @param grossAmount - Valor bruto do serviço/produto
 * @param commissionPercent - Percentual de comissão (ex: 50 para 50%)
 * @returns Objeto com detalhes do cálculo
 */
export function calculateCommission(
  grossAmount: number,
  commissionPercent: number
): CommissionCalculation {
  const commissionAmount = (grossAmount * commissionPercent) / 100;
  return {
    grossAmount,
    commissionPercent,
    commissionAmount,
  };
}

/**
 * Calcula o valor líquido após descontar a comissão
 * @param grossAmount - Valor bruto
 * @param commissionAmount - Valor da comissão
 * @returns Valor líquido para o barbeiro
 */
export function calculateNetAmount(
  grossAmount: number,
  commissionAmount: number
): number {
  return grossAmount - commissionAmount;
}

/**
 * Calcula comissões para múltiplos serviços/vendas
 * @param items - Array de itens com valor e percentual
 * @returns Objeto com totais
 */
export function calculateBulkCommissions(
  items: Array<{
    grossAmount: number;
    commissionPercent: number;
  }>
) {
  let totalGross = 0;
  let totalCommission = 0;

  items.forEach((item) => {
    const commission = calculateCommission(
      item.grossAmount,
      item.commissionPercent
    );
    totalGross += commission.grossAmount;
    totalCommission += commission.commissionAmount;
  });

  return {
    totalGross,
    totalCommission,
    totalNet: totalGross - totalCommission,
    itemCount: items.length,
  };
}

/**
 * Calcula comissão por tipo (serviço ou produto)
 * @param items - Array de vendas com tipo
 * @param barberConfig - Configuração de comissão do barbeiro
 * @returns Comissão segregada por tipo
 */
export function calculateCommissionByType(
  items: Array<{
    grossAmount: number;
    type: "service" | "product";
  }>,
  barberConfig: BarberCommissionConfig
) {
  const serviceCommissions = items
    .filter((item) => item.type === "service")
    .map((item) =>
      calculateCommission(item.grossAmount, barberConfig.serviceCommissionPercent)
    );

  const productCommissions = items
    .filter((item) => item.type === "product")
    .map((item) =>
      calculateCommission(item.grossAmount, barberConfig.productCommissionPercent)
    );

  const serviceTotal = serviceCommissions.reduce(
    (acc, c) => acc + c.commissionAmount,
    0
  );
  const productTotal = productCommissions.reduce(
    (acc, c) => acc + c.commissionAmount,
    0
  );

  return {
    service: {
      count: serviceCommissions.length,
      total: serviceTotal,
      commission: serviceCommissions,
    },
    product: {
      count: productCommissions.length,
      total: productTotal,
      commission: productCommissions,
    },
    grandTotal: serviceTotal + productTotal,
  };
}

/**
 * Calcula taxa percentual da barbearia (Master)
 * Baseado no faturamento bruto ANTES de descontar comissões dos barbeiros
 * @param totalGross - Faturamento bruto total
 * @param masterFeePercent - Percentual do plano Master (3-5%)
 * @returns Valor da taxa Master
 */
export function calculateMasterFee(
  totalGross: number,
  masterFeePercent: number
): number {
  return (totalGross * masterFeePercent) / 100;
}

/**
 * Calcula distribuição de receita com comissões de barbeiros e taxa Master
 * @param totalGross - Faturamento bruto
 * @param barberCommissionsTotal - Total de comissões de barbeiros
 * @param masterFeePercent - Percentual do plano Master
 * @returns Breakdown da distribuição
 */
export function calculateRevenueDistribution(
  totalGross: number,
  barberCommissionsTotal: number,
  masterFeePercent: number
) {
  const masterFee = calculateMasterFee(totalGross, masterFeePercent);
  const barbershopNet = totalGross - barberCommissionsTotal - masterFee;

  return {
    totalGross,
    barberCommissions: barberCommissionsTotal,
    masterFee,
    barbershopNet,
    breakdown: {
      barbershop: {
        percent: masterFeePercent,
        amount: masterFee,
      },
      barbers: {
        percent: (barberCommissionsTotal / totalGross) * 100,
        amount: barberCommissionsTotal,
      },
      owner: {
        percent: (barbershopNet / totalGross) * 100,
        amount: barbershopNet,
      },
    },
  };
}

/**
 * Valida se percentual de comissão é válido
 * @param percent - Valor do percentual
 * @returns true se válido
 */
export function isValidCommissionPercent(percent: number): boolean {
  return percent >= 0 && percent <= 100;
}

/**
 * Formata comissão para exibição
 * @param amount - Valor da comissão
 * @param currency - Código da moeda (padrão: BRL)
 * @returns String formatada
 */
export function formatCommissionAmount(
  amount: number,
  currency: string = "BRL"
): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount);
}
