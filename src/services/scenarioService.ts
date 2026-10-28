import { ScenarioDefinition, SavedProject } from '../models/types.js';
import { DEFAULT_SCENARIOS } from '../config/constants.js';
import { getSupabaseClient } from './supabaseClient.js';
import crypto from 'crypto';

class ScenarioService {
  private scenarios: Map<string, ScenarioDefinition> = new Map();
  private projects: Map<string, SavedProject> = new Map();
  private simulationHistory: Map<string, any> = new Map();

  constructor() {
    // Seed in-memory store
    DEFAULT_SCENARIOS.forEach((sc) => {
      this.scenarios.set(sc.id, { ...sc });
    });
  }

  async getAllScenarios(filters?: { category?: string; search?: string }): Promise<ScenarioDefinition[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('scenarios').select('*');
        if (filters?.category) {
          query = query.eq('category', filters.category);
        }
        if (filters?.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            description: d.description,
            locationType: d.location_type,
            dataSource: d.data_source,
            modelVersion: d.model_version,
            visibility: d.visibility,
            inputParameters: d.input_parameters,
            baselineParameters: d.baseline_parameters,
            defaultPlanA: d.default_plan_a,
            defaultPlanB: d.default_plan_b,
          }));
        }
      } catch (err) {
        console.warn('Supabase query failed, using in-memory scenarios', err);
      }
    }

    // In-memory fallback
    let list = Array.from(this.scenarios.values());
    if (filters?.category) {
      list = list.filter((s) => s.category === filters.category);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return list;
  }

  async getScenarioById(id: string): Promise<ScenarioDefinition | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('scenarios').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            id: data.id,
            name: data.name,
            category: data.category,
            description: data.description,
            locationType: data.location_type,
            dataSource: data.data_source,
            modelVersion: data.model_version,
            visibility: data.visibility,
            inputParameters: data.input_parameters,
            baselineParameters: data.baseline_parameters,
            defaultPlanA: data.default_plan_a,
            defaultPlanB: data.default_plan_b,
          };
        }
      } catch (err) {
        // Fall back to in-memory
      }
    }
    return this.scenarios.get(id) ?? null;
  }

  async createScenario(scenario: Omit<ScenarioDefinition, 'id'>): Promise<ScenarioDefinition> {
    const id = crypto.randomUUID();
    const newScenario: ScenarioDefinition = {
      ...scenario,
      id,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('scenarios').insert({
          id,
          name: newScenario.name,
          category: newScenario.category,
          description: newScenario.description,
          location_type: newScenario.locationType,
          data_source: newScenario.dataSource,
          model_version: newScenario.modelVersion,
          visibility: newScenario.visibility,
          input_parameters: newScenario.inputParameters,
          baseline_parameters: newScenario.baselineParameters,
          default_plan_a: newScenario.defaultPlanA,
          default_plan_b: newScenario.defaultPlanB,
        });
      } catch (err) {
        console.warn('Supabase scenario insert failed, stored in memory', err);
      }
    }

    this.scenarios.set(id, newScenario);
    return newScenario;
  }

  // Simulation run store
  saveSimulationRun(id: string, run: any) {
    this.simulationHistory.set(id, run);
  }

  getSimulationRun(id: string) {
    return this.simulationHistory.get(id) ?? null;
  }

  // Saved Projects
  async getAllProjects(): Promise<SavedProject[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createProject(project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedProject> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newProject: SavedProject = {
      ...project,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async getProjectById(id: string): Promise<SavedProject | null> {
    return this.projects.get(id) ?? null;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

export const scenarioService = new ScenarioService();
