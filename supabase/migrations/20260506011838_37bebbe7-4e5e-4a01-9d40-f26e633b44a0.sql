-- Status enum for appointments
CREATE TYPE public.appointment_status AS ENUM (
  'scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled'
);

-- Barbers
CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_barbers_owner ON public.barbers(owner_id);

CREATE POLICY "Owners manage own barbers" ON public.barbers
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins view all barbers" ON public.barbers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_services_owner ON public.services(owner_id);

CREATE POLICY "Owners manage own services" ON public.services
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins view all services" ON public.services
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_owner ON public.clients(owner_id);

CREATE POLICY "Owners manage own clients" ON public.clients
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins view all clients" ON public.clients
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_appointments_owner ON public.appointments(owner_id);
CREATE INDEX idx_appointments_starts ON public.appointments(starts_at);
CREATE INDEX idx_appointments_barber ON public.appointments(barber_id);

CREATE POLICY "Owners manage own appointments" ON public.appointments
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins view all appointments" ON public.appointments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER trg_barbers_updated_at BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();