-- Supabase Migration: 001_initial_schema.sql
-- WhatIf City: Interactive Urban Scenario Simulation Platform

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Scenarios Table (Public and User-Created)
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('traffic', 'pedestrian', 'parking', 'transit', 'one-way', 'waste')),
    description TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'intersection',
    input_parameters JSONB NOT NULL,
    baseline_parameters JSONB,
    default_plan_a JSONB,
    default_plan_b JSONB,
    data_source TEXT NOT NULL DEFAULT 'synthetic_baseline',
    model_version TEXT NOT NULL DEFAULT 'v1.0.0-discrete-queue',
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Simulation Runs Table
CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    model_version TEXT NOT NULL,
    input_parameters JSONB NOT NULL,
    results JSONB NOT NULL,
    assumptions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Saved Projects Table
CREATE TABLE IF NOT EXISTS public.saved_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scenarios_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_category ON public.scenarios(category);
CREATE INDEX IF NOT EXISTS idx_scenarios_visibility ON public.scenarios(visibility);
CREATE INDEX IF NOT EXISTS idx_scenarios_owner ON public.scenarios(owner_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_scenario ON public.simulation_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_owner ON public.simulation_runs(owner_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_owner ON public.saved_projects(owner_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Scenarios Policies
CREATE POLICY "Public scenarios are readable by everyone" 
    ON public.scenarios FOR SELECT 
    USING (visibility = 'public' OR auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create scenarios" 
    ON public.scenarios FOR INSERT 
    WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Owners can update their scenarios" 
    ON public.scenarios FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their scenarios" 
    ON public.scenarios FOR DELETE 
    USING (auth.uid() = owner_id);

-- Simulation Runs Policies
CREATE POLICY "Public simulation runs or owner runs viewable" 
    ON public.simulation_runs FOR SELECT 
    USING (owner_id IS NULL OR auth.uid() = owner_id);

CREATE POLICY "Users or guests can insert simulation runs" 
    ON public.simulation_runs FOR INSERT 
    WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

-- Saved Projects Policies
CREATE POLICY "Users can only view their own projects" 
    ON public.saved_projects FOR SELECT 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own projects" 
    ON public.saved_projects FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects" 
    ON public.saved_projects FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects" 
    ON public.saved_projects FOR DELETE 
    USING (auth.uid() = owner_id);
