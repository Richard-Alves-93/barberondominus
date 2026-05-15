import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeesList, usePayrollByPeriod, useMarkPayrollAsPaid } from "@/hooks/useEmployees";
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
import { CheckCircle2, DollarSign, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { pt } from "date-fns/locale";

export const PayrollReport = () => {
  const { user } = useAuth();
  const { data: employees = [] } = useEmployeesList(user?.id || "");

  const [startDate, setStartDate] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: payrollSummary = [] } = usePayrollByPeriod(
    user?.id || "",
    selectedEmployeeId,
    new Date(startDate),
    new Date(endDate)
  );

  const markPaid = useMarkPayrollAsPaid();

  const totalGross = payrollSummary.reduce((acc, p) => acc + p.total_gross, 0);
  const totalCommission = payrollSummary.reduce(
    (acc, p) => acc + p.total_commission,
    0
  );
  const totalPending = payrollSummary.reduce(
    (acc, p) => acc + p.pending_commission,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Folha de Pagamento</h1>
        <p className="text-gray-600 mt-2">
          Acompanhe e gerencie as comissões dos funcionários
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="employee-filter">Funcionário</Label>
              <select
                id="employee-filter"
                value={selectedEmployeeId || ""}
                onChange={(e) =>
                  setSelectedEmployeeId(e.target.value || null)
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="">Todos os funcionários</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
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

      {/* Summary Cards */}
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
            <CardTitle className="text-sm font-medium">Total de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalCommission)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Folha</CardTitle>
          <CardDescription>
            Período de {format(new Date(startDate), "dd 'de' MMMM", { locale: pt })} a{" "}
            {format(new Date(endDate), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payrollSummary.length === 0 ? (
            <p className="text-center text-gray-600 py-8">
              Nenhum registro de comissão neste período
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Serviços</TableHead>
                    <TableHead className="text-right">Produtos</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollSummary.map((entry) => (
                    <TableRow key={entry.employee_id}>
                      <TableCell className="font-medium">
                        {entry.employee_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.position}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.total_gross)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(entry.total_commission)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {entry.total_service_entries}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {entry.total_product_entries}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.pending_commission > 0 ? (
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(entry.pending_commission)}
                          </span>
                        ) : (
                          <span className="text-green-600">Pago</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.pending_commission > 0 ? (
                          <Badge variant="secondary">Pendente</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Pago
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Action */}
      {totalPending > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-semibold">Folha Pendente</p>
                  <p className="text-sm text-gray-600">
                    Total de {formatCurrency(totalPending)} a pagar
                  </p>
                </div>
              </div>
              <Button className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Marcar como Pago
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
