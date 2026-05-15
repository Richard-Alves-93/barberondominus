import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateEmployee, useEmployeesList, useUpdateEmployee, useDeactivateEmployee } from "@/hooks/useEmployees";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const POSITION_LABELS = {
  admin: "Admin (Dono)",
  gerente: "Gerente",
  atendente: "Atendente",
  barbeiro: "Barbeiro",
};

const SALARY_TYPE_LABELS = {
  fixed: "Salário Fixo",
  commission: "Comissão",
  hybrid: "Híbrido (Fixo + Comissão)",
};

export const EmployeeManagement = () => {
  const { user } = useAuth();
  const { data: employees = [], isLoading } = useEmployeesList(user?.id || "");
  const deactivateEmployee = useDeactivateEmployee();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const handleDelete = async (employee: any) => {
    if (!user?.id) return;
    if (confirm("Tem a certeza? Esta ação não pode ser desfeita e removerá o histórico de acesso deste utilizador")) {
      await deactivateEmployee.mutateAsync({
        employeeId: employee.id,
        ownerId: user.id
      });
    }
  };

  if (isLoading) {
    return <div>Carregando funcionários...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipe</h1>
          <p className="text-gray-600 mt-2">Gerencie funcionários e suas permissões</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Funcionário</DialogTitle>
              <DialogDescription>
                Preencha os dados para adicionar um novo funcionário
              </DialogDescription>
            </DialogHeader>
            <CreateEmployeeForm
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees List */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">
                Nenhum funcionário cadastrado
              </p>
            </CardContent>
          </Card>
        ) : (
          employees.map((employee) => (
            <Card key={employee.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{employee.name}</h3>
                      <Badge variant="outline">
                        {POSITION_LABELS[employee.position as keyof typeof POSITION_LABELS]}
                      </Badge>
                      <Badge variant="secondary">
                        {SALARY_TYPE_LABELS[employee.salary_type as keyof typeof SALARY_TYPE_LABELS]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                    {employee.phone && (
                      <p className="text-sm text-gray-600">{employee.phone}</p>
                    )}
                    {employee.commission_enabled && employee.position === "barbeiro" && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Comissão: {employee.service_commission_percent}% (serviços) |{" "}
                        {employee.product_commission_percent}% (produtos)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedEmployee(employee)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Editar Funcionário</DialogTitle>
                          <DialogDescription>Atualize os dados de {employee.name}</DialogDescription>
                        </DialogHeader>
                        <CreateEmployeeForm 
                          initialData={employee}
                          onSuccess={() => setIsDialogOpen(false)} 
                        />
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(employee)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

interface CreateEmployeeFormProps {
  onSuccess?: () => void;
  initialData?: any;
}

const CreateEmployeeForm = ({ onSuccess, initialData }: CreateEmployeeFormProps) => {
  const { user } = useAuth();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    position: (initialData?.position || "atendente") as EmployeePosition,
    salaryType: (initialData?.salary_type || "fixed") as "fixed" | "commission" | "hybrid",
    baseSalary: initialData?.base_salary || 0,
    commissionEnabled: initialData?.commission_enabled || false,
    serviceCommissionPercent: initialData?.service_commission_percent || 0,
    productCommissionPercent: initialData?.product_commission_percent || 0,
    hireDate: initialData?.hire_date || new Date().toISOString().split("T")[0],
  });

  const isBarber = formData.position === "barbeiro";
  const showCommissionFields = isBarber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert("Usuário não identificado");
      return;
    }

    if (initialData?.id) {
      await updateEmployee.mutateAsync({
        employeeId: initialData.id,
        ownerId: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        position: formData.position,
        salary_type: formData.salaryType,
        base_salary: formData.baseSalary,
        commission_enabled: showCommissionFields ? formData.commissionEnabled : false,
        service_commission_percent: showCommissionFields ? formData.serviceCommissionPercent : 0,
        product_commission_percent: showCommissionFields ? formData.productCommissionPercent : 0,
        hire_date: formData.hireDate,
      });
    } else {
      await createEmployee.mutateAsync({
        ownerId: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        position: formData.position,
        salaryType: formData.salaryType,
        baseSalary: formData.baseSalary,
        commissionEnabled: showCommissionFields ? formData.commissionEnabled : false,
        serviceCommissionPercent: showCommissionFields ? formData.serviceCommissionPercent : 0,
        productCommissionPercent: showCommissionFields ? formData.productCommissionPercent : 0,
        hireDate: formData.hireDate,
      });
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          placeholder="João Silva"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="mt-1"
        />
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="joao@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1"
        />
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          placeholder="(11) 99999-9999"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Position */}
      <div>
        <Label htmlFor="position">Função *</Label>
        <Select
          value={formData.position}
          onValueChange={(value: any) =>
            setFormData({ ...formData, position: value })
          }
        >
          <SelectTrigger id="position" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin (Dono)</SelectItem>
            <SelectItem value="gerente">Gerente</SelectItem>
            <SelectItem value="atendente">Atendente</SelectItem>
            <SelectItem value="barbeiro">Barbeiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Salary Type */}
      <div>
        <Label htmlFor="salary-type">Tipo de Remuneração *</Label>
        <Select
          value={formData.salaryType}
          onValueChange={(value: any) =>
            setFormData({ ...formData, salaryType: value })
          }
        >
          <SelectTrigger id="salary-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Salário Fixo</SelectItem>
            <SelectItem value="commission">Comissão</SelectItem>
            <SelectItem value="hybrid">Híbrido (Fixo + Comissão)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Base Salary */}
      <div>
        <Label htmlFor="base-salary">Salário Base (R$)</Label>
        <Input
          id="base-salary"
          type="number"
          min="0"
          step="0.01"
          value={formData.baseSalary}
          onChange={(e) =>
            setFormData({ ...formData, baseSalary: parseFloat(e.target.value) })
          }
          className="mt-1"
        />
      </div>

      {/* Commission Fields - Conditional Display */}
      {showCommissionFields && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <Label htmlFor="commission-enabled">Habilitar Comissão</Label>
            <Switch
              id="commission-enabled"
              checked={formData.commissionEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, commissionEnabled: checked })
              }
            />
          </div>

          {formData.commissionEnabled && (
            <>
              <div>
                <Label htmlFor="service-commission">
                  % Comissão sobre Serviços
                </Label>
                <Input
                  id="service-commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.serviceCommissionPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceCommissionPercent: parseFloat(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="product-commission">
                  % Comissão sobre Produtos
                </Label>
                <Input
                  id="product-commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.productCommissionPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productCommissionPercent: parseFloat(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Hire Date */}
      <div>
        <Label htmlFor="hire-date">Data de Contratação *</Label>
        <Input
          id="hire-date"
          type="date"
          value={formData.hireDate}
          onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
          required
          className="mt-1"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={createEmployee.isPending || !formData.name || !formData.email}
          className="flex-1"
        >
          {createEmployee.isPending ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
};
