import { BarberCommissionManager } from "@/components/BarberCommissionManager";
import { CommissionReportByPeriod } from "@/components/CommissionReportByPeriod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CommissionManagementPage() {
  return (
    <Tabs defaultValue="manage" className="w-full">
      <TabsList>
        <TabsTrigger value="manage">Gerenciar Comissões</TabsTrigger>
        <TabsTrigger value="report">Relatório de Período</TabsTrigger>
      </TabsList>
      <TabsContent value="manage">
        <BarberCommissionManager />
      </TabsContent>
      <TabsContent value="report">
        <CommissionReportByPeriod />
      </TabsContent>
    </Tabs>
  );
}
