import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopBarbers } from "@/hooks/useBarbershop";
import { useCommissionsByPeriod } from "@/hooks/useCommissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { pt } from "date-fns/locale";

export const CommissionReportByPeriod = () => {
  const { user } = useAuth();
  const { data: barbers = [] } = useBarbershopBarbers(user?.id || "");

  const [startDate, setStartDate] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    barbers[0]?.id || ""
  );

  const { data: commissionDataRaw } = useCommissionsByPeriod(
    selectedBarberId,
    new Date(startDate),
    new Date(endDate)
  );
  const commissionData = commissionDataRaw as any;

  const totalGross = commissionData?.total_gross || 0;
  const totalCommission = commissionData?.total_commission || 0;
  const netValue = totalGross - totalCommission;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatório de Comissões</h1>
        <p className="text-gray-600 mt-2">Acompanhe as comissões por período</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="barber-select">Barbeiro</Label>
              <select
                id="barber-select"
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalGross)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalCommission)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(netValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Período</CardTitle>
          <CardDescription>
            Período de {format(new Date(startDate), "dd 'de' MMMM", { locale: pt })} a{" "}
            {format(new Date(endDate), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Total de comissões:</span>
              <span className="font-semibold">
                {commissionData?.commission_count || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Comissões pagas:</span>
              <span className="font-semibold">
                {commissionData?.paid_count || 0}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3 mt-3">
              <span>Comissões pendentes:</span>
              <span className="font-semibold text-orange-600">
                {commissionData?.pending_count || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
