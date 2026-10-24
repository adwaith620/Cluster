-- ==============================================================================
-- Cluster Database Migration 2: Grant Table Privileges to PostgREST Roles
-- Run this in the Supabase SQL Editor if you see "permission denied for table sessions"
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.participants TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
