import { BarberCommissionDashboard } from "@/components/BarberCommissionDashboard";
import { useBarber } from "@/contexts/BarberContext";
import { Card, CardContent } from "@/components/ui/card";

export default function BarberCommissionsPage() {
  const { isBarber, loading } = useBarber();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isBarber) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-yellow-800">
            Você não está configurado como barbeiro. Contate o dono da barbearia.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <BarberCommissionDashboard />;
}
