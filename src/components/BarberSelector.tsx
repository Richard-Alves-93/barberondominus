import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopBarbers } from "@/hooks/useBarbershop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface BarberSelectorProps {
  value?: string;
  onChange: (barberId: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export const BarberSelector = ({
  value,
  onChange,
  label = "Barbeiro",
  required = true,
  disabled = false,
}: BarberSelectorProps) => {
  const { user } = useAuth();
  const { data: barbers = [] } = useBarbershopBarbers(user?.id || "");

  return (
    <div className="space-y-2">
      <Label htmlFor="barber-select">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="barber-select">
          <SelectValue placeholder="Selecione um barbeiro" />
        </SelectTrigger>
        <SelectContent>
          {barbers.map((barber) => (
            <SelectItem key={barber.id} value={barber.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: barber.color }}
                />
                <span>{barber.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface BarberMultiSelectorProps {
  value?: string[];
  onChange: (barberIds: string[]) => void;
  label?: string;
  maxSelections?: number;
}

export const BarberMultiSelector = ({
  value = [],
  onChange,
  label = "Barbeiros",
  maxSelections,
}: BarberMultiSelectorProps) => {
  const { user } = useAuth();
  const { data: barbers = [] } = useBarbershopBarbers(user?.id || "");

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="space-y-2">
        {barbers.map((barber) => (
          <div
            key={barber.id}
            className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50"
          >
            <input
              type="checkbox"
              id={`barber-${barber.id}`}
              checked={value.includes(barber.id)}
              onChange={(e) => {
                const newValue = e.target.checked
                  ? [...value, barber.id]
                  : value.filter((id) => id !== barber.id);

                if (maxSelections && newValue.length > maxSelections) {
                  return;
                }

                onChange(newValue);
              }}
              className="w-4 h-4"
            />
            <label
              htmlFor={`barber-${barber.id}`}
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: barber.color }}
              />
              <span>{barber.name}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

interface BarberListProps {
  onSelectBarber: (barberId: string, barberName: string) => void;
  selectedBarberId?: string;
}

export const BarberList = ({
  onSelectBarber,
  selectedBarberId,
}: BarberListProps) => {
  const { user } = useAuth();
  const { data: barbers = [] } = useBarbershopBarbers(user?.id || "");

  return (
    <div className="space-y-2">
      {barbers.map((barber) => (
        <Card
          key={barber.id}
          className={`cursor-pointer transition-colors ${
            selectedBarberId === barber.id
              ? "border-blue-500 bg-blue-50"
              : "hover:border-gray-400"
          }`}
          onClick={() => onSelectBarber(barber.id, barber.name)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: barber.color }}
              />
              <div>
                <p className="font-medium">{barber.name}</p>
                {barber.commission_enabled && (
                  <p className="text-xs text-gray-600">
                    Comissão: {barber.service_commission_percent}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
