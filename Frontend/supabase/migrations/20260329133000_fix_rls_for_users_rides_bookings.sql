-- Align RLS policies with current schema (users/rides/bookings/ratings)

alter table if exists public.users enable row level security;
alter table if exists public.rides enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.ratings enable row level security;

-- USERS policies
DROP POLICY IF EXISTS users_select_all ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;

CREATE POLICY users_select_all
ON public.users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY users_insert_own
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY users_update_own
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- RIDES policies
DROP POLICY IF EXISTS rides_select_all ON public.rides;
DROP POLICY IF EXISTS rides_insert_own ON public.rides;
DROP POLICY IF EXISTS rides_update_own ON public.rides;
DROP POLICY IF EXISTS rides_delete_own ON public.rides;

CREATE POLICY rides_select_all
ON public.rides
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY rides_insert_own
ON public.rides
FOR INSERT
TO authenticated
WITH CHECK (driver_id = auth.uid());

CREATE POLICY rides_update_own
ON public.rides
FOR UPDATE
TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

CREATE POLICY rides_delete_own
ON public.rides
FOR DELETE
TO authenticated
USING (driver_id = auth.uid());

-- BOOKINGS policies
DROP POLICY IF EXISTS bookings_select_related ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_own ON public.bookings;
DROP POLICY IF EXISTS bookings_update_own ON public.bookings;

CREATE POLICY bookings_select_related
ON public.bookings
FOR SELECT
TO authenticated
USING (
  passenger_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.id = bookings.ride_id
      AND r.driver_id = auth.uid()
  )
);

CREATE POLICY bookings_insert_own
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (passenger_id = auth.uid());

CREATE POLICY bookings_update_own
ON public.bookings
FOR UPDATE
TO authenticated
USING (passenger_id = auth.uid())
WITH CHECK (passenger_id = auth.uid());

-- RATINGS policies
DROP POLICY IF EXISTS ratings_select_all ON public.ratings;
DROP POLICY IF EXISTS ratings_insert_own ON public.ratings;

CREATE POLICY ratings_select_all
ON public.ratings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY ratings_insert_own
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (rater_id = auth.uid());
