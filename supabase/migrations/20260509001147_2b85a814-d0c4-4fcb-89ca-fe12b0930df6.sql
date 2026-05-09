
-- 1. staff_members table
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  active boolean NOT NULL DEFAULT true,
  can_pdv boolean NOT NULL DEFAULT true,
  can_agenda boolean NOT NULL DEFAULT true,
  can_view_clients boolean NOT NULL DEFAULT true,
  can_view_services boolean NOT NULL DEFAULT true,
  can_cancel_sales boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_manage_stock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, user_id)
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_staff_members_updated_at
BEFORE UPDATE ON public.staff_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. helper functions
CREATE OR REPLACE FUNCTION public.get_owner_for(uid uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.staff_members WHERE user_id = uid AND active = true LIMIT 1),
    uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(uid uuid, oid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT uid = oid OR EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = uid AND owner_id = oid AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(uid uuid, oid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT uid = oid; $$;

-- 3. staff_members policies
CREATE POLICY "Owners view own staff" ON public.staff_members
FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = user_id);

CREATE POLICY "Owners insert staff" ON public.staff_members
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update staff" ON public.staff_members
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete staff" ON public.staff_members
FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Admins view all staff" ON public.staff_members
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Update RLS policies on shared tables
-- appointments
DROP POLICY IF EXISTS "Owners manage own appointments" ON public.appointments;
CREATE POLICY "Members manage barbershop appointments" ON public.appointments
FOR ALL USING (public.is_member_of(auth.uid(), owner_id))
WITH CHECK (public.is_member_of(auth.uid(), owner_id));

-- clients (read for staff with can_view_clients, write only for owner)
DROP POLICY IF EXISTS "Owners manage own clients" ON public.clients;
CREATE POLICY "Owner manages clients" ON public.clients
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Staff view clients" ON public.clients
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = clients.owner_id
      AND active = true AND can_view_clients = true)
);

-- services (read for staff, write owner)
DROP POLICY IF EXISTS "Owners manage own services" ON public.services;
CREATE POLICY "Owner manages services" ON public.services
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Staff view services" ON public.services
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = services.owner_id
      AND active = true AND can_view_services = true)
);

-- barbers (read for any member, write only owner)
DROP POLICY IF EXISTS "Owners manage own barbers" ON public.barbers;
CREATE POLICY "Owner manages barbers" ON public.barbers
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Members view barbers" ON public.barbers
FOR SELECT USING (public.is_member_of(auth.uid(), owner_id));

-- sales (full for any member with can_pdv; cancel/delete restricted in UI)
DROP POLICY IF EXISTS "Owners manage own sales" ON public.sales;
CREATE POLICY "Owner manages sales" ON public.sales
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Staff create sales" ON public.sales
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = sales.owner_id
      AND active = true AND can_pdv = true)
);
CREATE POLICY "Staff view sales" ON public.sales
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = sales.owner_id
      AND active = true AND can_pdv = true)
);
CREATE POLICY "Staff cancel sales" ON public.sales
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = sales.owner_id
      AND active = true AND can_cancel_sales = true)
);
CREATE POLICY "Staff delete sales" ON public.sales
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = sales.owner_id
      AND active = true AND can_cancel_sales = true)
);

-- products: owner full; staff view if can_pdv (need to check stock); staff manage if can_manage_stock
DROP POLICY IF EXISTS "Owners manage own products" ON public.products;
CREATE POLICY "Owner manages products" ON public.products
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Staff view products" ON public.products
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = products.owner_id
      AND active = true AND (can_pdv = true OR can_manage_stock = true))
);
CREATE POLICY "Staff manage products" ON public.products
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = products.owner_id
      AND active = true AND can_manage_stock = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = products.owner_id
      AND active = true AND can_manage_stock = true)
);

-- stock_movements: any member with pdv can insert (out via sale); owner/manage_stock full
DROP POLICY IF EXISTS "Owners manage own stock_movements" ON public.stock_movements;
CREATE POLICY "Owner manages stock_movements" ON public.stock_movements
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Staff insert stock_movements" ON public.stock_movements
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = stock_movements.owner_id
      AND active = true AND (can_pdv = true OR can_manage_stock = true))
);
CREATE POLICY "Staff view stock_movements" ON public.stock_movements
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND owner_id = stock_movements.owner_id
      AND active = true AND can_manage_stock = true)
);

-- service_products
DROP POLICY IF EXISTS "Owners manage own service_products" ON public.service_products;
CREATE POLICY "Owner manages service_products" ON public.service_products
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Members view service_products" ON public.service_products
FOR SELECT USING (public.is_member_of(auth.uid(), owner_id));
