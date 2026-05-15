import { useState } from "react";
import { BarberSelector } from "@/components/BarberSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateCommissionFromAppointment } from "@/hooks/useAppointmentCommissions";
import { AlertCircle, CheckCircle } from "lucide-react";

interface MarkAppointmentAsCompletedProps {
  appointmentId: string;
  ownerId: string;
  servicePrice: number;
  onSuccess?: () => void;
}

/**
 * Componente para marcar agendamento como concluído e gerar comissão
 * Usado quando um serviço é finalizado e precisa gerar comissão para o barbeiro
 */
export const MarkAppointmentAsCompleted = ({
  appointmentId,
  ownerId,
  servicePrice,
  onSuccess,
}: MarkAppointmentAsCompletedProps) => {
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const createCommission = useCreateCommissionFromAppointment();

  const handleMarkAsCompleted = async () => {
    if (!selectedBarberId) {
      alert("Selecione um barbeiro");
      return;
    }

    try {
      await createCommission.mutateAsync({
        appointmentId,
        barberId: selectedBarberId,
        ownerId,
        grossAmount: servicePrice,
      });

      onSuccess?.();
    } catch (error) {
      console.error("Erro ao marcar agendamento como concluído:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finalizar Agendamento</CardTitle>
        <CardDescription>
          Selecione o barbeiro que realizou o serviço
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            Valor do serviço: <strong>R$ {servicePrice.toFixed(2)}</strong>
          </p>
        </div>

        <BarberSelector
          value={selectedBarberId}
          onChange={setSelectedBarberId}
          label="Barbeiro que realizou o serviço"
          required
        />

        <Button
          onClick={handleMarkAsCompleted}
          disabled={createCommission.isPending || !selectedBarberId}
          className="w-full"
        >
          {createCommission.isPending ? (
            "Processando..."
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como Concluído
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Componente para seleção de barbeiro em tela de PDV
 * Usado quando registrando uma venda de serviço/produto
 */
export interface BarberSelectionInSalesProps {
  value?: string;
  onChange: (barberId: string) => void;
  required?: boolean;
}

export const BarberSelectionInSales = ({
  value,
  onChange,
  required = true,
}: BarberSelectionInSalesProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações do Serviço</CardTitle>
      </CardHeader>
      <CardContent>
        <BarberSelector
          value={value}
          onChange={onChange}
          label="Qual barbeiro realizou este serviço?"
          required={required}
        />
      </CardContent>
    </Card>
  );
};

/**
 * Modal para confirmar conclusão de agendamento com geração de comissão
 */
export interface CompleteAppointmentModalProps {
  isOpen: boolean;
  appointmentId: string;
  ownerId: string;
  servicePrice: number;
  onClose: () => void;
  onConfirm?: () => void;
}

export const CompleteAppointmentModal = ({
  isOpen,
  appointmentId,
  ownerId,
  servicePrice,
  onClose,
  onConfirm,
}: CompleteAppointmentModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <MarkAppointmentAsCompleted
          appointmentId={appointmentId}
          ownerId={ownerId}
          servicePrice={servicePrice}
          onSuccess={() => {
            onConfirm?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
};
