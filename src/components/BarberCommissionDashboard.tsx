import { useBarber } from "@/contexts/BarberContext";
import { useBarberPendingCommissions } from "@/hooks/useCommissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const BarberCommissionDashboard = () => {
  const { barber, commissionSummary, loading } = useBarber();
  const { data: pendingCommissions = [] } = useBarberPendingCommissions(barber?.id || "");

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!barber) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-yellow-800">
            Você não está configurado como barbeiro nesta barbearia.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPending = commissionSummary?.total_commission || 0;
  const totalGross = commissionSummary?.total_gross || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Relatório de Comissões</h1>
        <p className="text-gray-600 mt-2">Acompanhe suas comissões e rendimentos</p>
      </div>

      {/* Commission Status */}
      {!barber.commission_enabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 text-sm">
            ℹ️ O sistema de comissões não está habilitado para você. Contate o dono da barbearia.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Pendente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {commissionSummary?.commission_count || 0} comissões pendentes
            </p>
          </CardContent>
        </Card>

        {/* Total Bruto */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalGross)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              De serviços e produtos
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Comissão */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {barber.service_commission_percent}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Sobre serviços
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Comissões Recentes</CardTitle>
          <CardDescription>Últimas comissões geradas</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingCommissions.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma comissão pendente</p>
          ) : (
            <div className="space-y-4">
              {pendingCommissions.slice(0, 5).map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {commission.commission_type === "service"
                        ? "Comissão de Serviço"
                        : "Comissão de Produto"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(commission.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(commission.commission_amount)}
                    </p>
                    <Badge variant={commission.paid ? "default" : "secondary"}>
                      {commission.paid ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
