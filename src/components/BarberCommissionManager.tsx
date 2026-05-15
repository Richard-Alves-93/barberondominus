import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopBarbers } from "@/hooks/useBarbershop";
import {
  useBarbershipCommissionsSummary,
  useUpdateCommissionConfig,
} from "@/hooks/useCommissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const BarberCommissionManager = () => {
  const { user } = useAuth();
  const { data: barbers = [], isLoading: barbersLoading } = useBarbershopBarbers(
    user?.id || ""
  );
  const { data: commissionsSummary = [] } = useBarbershipCommissionsSummary(
    user?.id || ""
  );
  const updateCommissionConfig = useUpdateCommissionConfig();
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);

  if (barbersLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Comissões</h1>
        <p className="text-gray-600 mt-2">Configure e monitore as comissões dos barbeiros</p>
      </div>

      {/* Summary Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comissões Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                commissionsSummary.reduce((acc, c) => acc + c.pending_commission, 0)
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              De {commissionsSummary.reduce((acc, c) => acc + c.commission_count, 0)} comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faturamento Bruto</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                commissionsSummary.reduce((acc, c) => acc + c.total_gross, 0)
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Antes de descontar comissões
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barbers List */}
      <Card>
        <CardHeader>
          <CardTitle>Barbeiros</CardTitle>
          <CardDescription>Configurar comissões por barbeiro</CardDescription>
        </CardHeader>
        <CardContent>
          {barbers.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum barbeiro cadastrado</p>
          ) : (
            <div className="space-y-4">
              {barbers.map((barber) => {
                const summary = commissionsSummary.find(
                  (c) => c.barber_id === barber.id
                );

                return (
                  <div
                    key={barber.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: barber.color }}
                      />
                      <div>
                        <p className="font-semibold">{barber.name}</p>
                        <p className="text-sm text-gray-600">
                          {barber.commission_enabled
                            ? `${barber.service_commission_percent}% de comissão`
                            : "Comissão desabilitada"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">
                          {formatCurrency(summary?.pending_commission || 0)}
                        </p>
                        <p className="text-xs text-gray-600">Pendente</p>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingBarberId(barber.id)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Configurar Comissão - {barber.name}</DialogTitle>
                            <DialogDescription>
                              Defina as porcentagens de comissão para este barbeiro
                            </DialogDescription>
                          </DialogHeader>
                          <BarberCommissionForm
                            barber={barber}
                            onClose={() => setEditingBarberId(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface BarberCommissionFormProps {
  barber: any;
  onClose: () => void;
}

const BarberCommissionForm = ({ barber, onClose }: BarberCommissionFormProps) => {
  const [commissionEnabled, setCommissionEnabled] = useState(barber.commission_enabled);
  const [serviceCommission, setServiceCommission] = useState(
    barber.service_commission_percent
  );
  const [productCommission, setProductCommission] = useState(
    barber.product_commission_percent
  );
  const updateCommission = useUpdateCommissionConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateCommission.mutateAsync({
      barberId: barber.id,
      serviceCommissionPercent: serviceCommission,
      productCommissionPercent: productCommission,
      commissionEnabled,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="commission-enabled">Habilitar Comissão</Label>
        <Switch
          id="commission-enabled"
          checked={commissionEnabled}
          onCheckedChange={setCommissionEnabled}
        />
      </div>

      {commissionEnabled && (
        <>
          <div>
            <Label htmlFor="service-commission">
              Comissão sobre Serviços (%)
            </Label>
            <Input
              id="service-commission"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={serviceCommission}
              onChange={(e) => setServiceCommission(parseFloat(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="product-commission">
              Comissão sobre Produtos (%)
            </Label>
            <Input
              id="product-commission"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={productCommission}
              onChange={(e) => setProductCommission(parseFloat(e.target.value))}
              className="mt-1"
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={updateCommission.isPending}>
          {updateCommission.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
