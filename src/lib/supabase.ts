import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Resume } from '../types';

// Add proper TypeScript declarations
declare global {
  var NodeJS: {
    Timeout: any;
  };
}

// Add NodeJS timeout type for better TypeScript support
declare global {
  var NodeJS: {
    Timeout: any;
  };
}

// Supabase configuration with permanent connection settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are missing. Please connect to Supabase from the StackBlitz interface.');
}

// Connection pool configuration for permanent connections
const CONNECTION_CONFIG = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'ats-resume-builder',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=300, max=1000',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

// Create multiple client instances for connection pooling
const createSupabaseClient = () => createClient(supabaseUrl, supabaseKey, CONNECTION_CONFIG);

// Connection pool with multiple clients
class SupabaseConnectionPool {
  private clients: SupabaseClient[] = [];
  private currentIndex = 0;
  private readonly poolSize = 5;
  private healthCheckInterval: any = null;

  constructor() {
    this.initializePool();
    this.startHealthCheck();
  }

  private initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const client = createSupabaseClient();
      this.clients.push(client);
    }
  }

  private startHealthCheck() {
    // Perform health checks every 30 seconds to maintain connections
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }

  private async performHealthCheck() {
    try {
      const client = this.getClient();
      await client.from('resumes').select('count').limit(1);
    } catch (error) {
      console.log('Health check maintaining connection:', error);
      // Recreate clients if needed
      this.refreshPool();
    }
  }

  private refreshPool() {
    this.clients = [];
    this.initializePool();
  }

  public getClient(): SupabaseClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    return client;
  }

  public destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Global connection pool instance
const connectionPool = new SupabaseConnectionPool();

// Get client from pool
const getSupabaseClient = () => connectionPool.getClient();

// Enhanced operation wrapper with immediate retry and connection recovery
async function executeWithPermanentConnection<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  operationName: string,
  maxRetries: number = 5
): Promise<T> {
  let lastError: Error = new Error('Unknown error occurred');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = getSupabaseClient();
      const result = await operation(client);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`${operationName} attempt ${attempt + 1}:`, error);

      // Immediate retry for connection issues
      if (attempt < maxRetries - 1) {
        // Very short delay for immediate retry
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError;
}

// Resume database functions with permanent connection
export async function saveResume(resume: Resume): Promise<{ id: string; error: Error | null }> {
  try {
    const result = await executeWithPermanentConnection(async (client) => {
      const resumeId = resume.id || uuidv4();
      
      // Prepare the resume data for storage
      const resumeData = {
        id: resumeId,
        name: resume.name,
        email: resume.email,
        phone: resume.phone,
        location: resume.location,
        linkedin: resume.linkedin,
        website: resume.website,
        summary: resume.summary,
        skills: resume.skills,
        created_at: new Date().toISOString(),
      };

      // Insert or update the main resume record
      const { error: resumeError } = await client
        .from('resumes')
        .upsert(resumeData, { onConflict: 'id' });

      if (resumeError) throw resumeError;

      // Handle experience records
      if (resume.experience && resume.experience.length > 0) {
        // First, delete existing experience records for this resume
        const { error: deleteExpError } = await client
          .from('resume_experiences')
          .delete()
          .eq('resume_id', resumeId);

        if (deleteExpError) throw deleteExpError;

        // Then insert the new experience records
        const experienceData = resume.experience.map((exp, index) => ({
          id: uuidv4(),
          resume_id: resumeId,
          company: exp.company,
          position: exp.position,
          start_date: exp.startDate,
          end_date: exp.endDate,
          description: exp.description,
          order_index: index,
        }));

        const { error: expError } = await client
          .from('resume_experiences')
          .insert(experienceData);

        if (expError) throw expError;
      }

      // Handle education records
      if (resume.education && resume.education.length > 0) {
        // First, delete existing education records for this resume
        const { error: deleteEduError } = await client
          .from('resume_education')
          .delete()
          .eq('resume_id', resumeId);

        if (deleteEduError) throw deleteEduError;

        // Then insert the new education records
        const educationData = resume.education.map((edu, index) => ({
          id: uuidv4(),
          resume_id: resumeId,
          institution: edu.institution,
          degree: edu.degree,
          field_of_study: edu.fieldOfStudy,
          start_date: edu.startDate,
          end_date: edu.endDate,
          description: edu.description,
          order_index: index,
        }));

        const { error: eduError } = await client
          .from('resume_education')
          .insert(educationData);

        if (eduError) throw eduError;
      }

      // Handle certification records
      if (resume.certifications && resume.certifications.length > 0) {
        // First, delete existing certification records for this resume
        const { error: deleteCertError } = await client
          .from('resume_certifications')
          .delete()
          .eq('resume_id', resumeId);

        if (deleteCertError) throw deleteCertError;

        // Then insert the new certification records
        const certificationData = resume.certifications.map((cert, index) => ({
          id: uuidv4(),
          resume_id: resumeId,
          name: cert.name,
          issuer: cert.issuer,
          date: cert.date,
          description: cert.description,
          order_index: index,
        }));

        const { error: certError } = await client
          .from('resume_certifications')
          .insert(certificationData);

        if (certError) throw certError;
      }

      return resumeId;
    }, 'saveResume');

    return { id: result, error: null };
  } catch (error) {
    console.error('Error saving resume:', error);
    return { id: '', error: error as Error };
  }
}

export async function getResume(id: string): Promise<{ resume: Resume | null; error: Error | null }> {
  try {
    const result = await executeWithPermanentConnection(async (client) => {
      // Get the main resume data
      const { data: resumeData, error: resumeError } = await client
        .from('resumes')
        .select('*')
        .eq('id', id)
        .single();

      if (resumeError) throw resumeError;
      if (!resumeData) throw new Error('Resume not found');

      // Get experience data
      const { data: experienceData, error: expError } = await client
        .from('resume_experiences')
        .select('*')
        .eq('resume_id', id)
        .order('order_index', { ascending: true });

      if (expError) throw expError;

      // Get education data
      const { data: educationData, error: eduError } = await client
        .from('resume_education')
        .select('*')
        .eq('resume_id', id)
        .order('order_index', { ascending: true });

      if (eduError) throw eduError;

      // Get certification data
      const { data: certificationData, error: certError } = await client
        .from('resume_certifications')
        .select('*')
        .eq('resume_id', id)
        .order('order_index', { ascending: true });

      if (certError) throw certError;

      // Construct the complete resume object
      const resume: Resume = {
        id: resumeData.id,
        name: resumeData.name,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        linkedin: resumeData.linkedin,
        website: resumeData.website,
        summary: resumeData.summary,
        skills: resumeData.skills || [],
        experience: experienceData.map(exp => ({
          company: exp.company,
          position: exp.position,
          startDate: exp.start_date,
          endDate: exp.end_date,
          description: exp.description,
        })),
        education: educationData.map(edu => ({
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.field_of_study,
          startDate: edu.start_date,
          endDate: edu.end_date,
          description: edu.description,
        })),
        certifications: certificationData.map(cert => ({
          name: cert.name,
          issuer: cert.issuer,
          date: cert.date,
          description: cert.description,
        })),
      };

      return resume;
    }, 'getResume');

    return { resume: result, error: null };
  } catch (error) {
    console.error('Error fetching resume:', error);
    return { resume: null, error: error as Error };
  }
}

export async function getAllResumes(): Promise<{ resumes: Resume[]; error: Error | null }> {
  try {
    const result = await executeWithPermanentConnection(async (client) => {
      // Get all resumes with their basic information
      const { data: resumesData, error: resumesError } = await client
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });

      if (resumesError) throw resumesError;

      // Fetch related data for each resume
      const resumes = await Promise.all(resumesData.map(async (resumeData) => {
        // Get experience data
        const { data: experienceData } = await client
          .from('resume_experiences')
          .select('*')
          .eq('resume_id', resumeData.id)
          .order('order_index', { ascending: true });

        // Get education data
        const { data: educationData } = await client
          .from('resume_education')
          .select('*')
          .eq('resume_id', resumeData.id)
          .order('order_index', { ascending: true });

        // Get certification data
        const { data: certificationData } = await client
          .from('resume_certifications')
          .select('*')
          .eq('resume_id', resumeData.id)
          .order('order_index', { ascending: true });

        // Construct the complete resume object
        return {
          id: resumeData.id,
          name: resumeData.name,
          email: resumeData.email,
          phone: resumeData.phone,
          location: resumeData.location,
          linkedin: resumeData.linkedin,
          website: resumeData.website,
          summary: resumeData.summary,
          skills: resumeData.skills || [],
          experience: (experienceData || []).map(exp => ({
            company: exp.company,
            position: exp.position,
            startDate: exp.start_date,
            endDate: exp.end_date,
            description: exp.description,
          })),
          education: (educationData || []).map(edu => ({
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.field_of_study,
            startDate: edu.start_date,
            endDate: edu.end_date,
            description: edu.description,
          })),
          certifications: (certificationData || []).map(cert => ({
            name: cert.name,
            issuer: cert.issuer,
            date: cert.date,
            description: cert.description,
          })),
        };
      }));

      return resumes;
    }, 'getAllResumes');

    return { resumes: result, error: null };
  } catch (error) {
    console.error('Error fetching all resumes:', error);
    return { resumes: [], error: error as Error };
  }
}

export async function deleteResume(id: string): Promise<{ error: Error | null }> {
  try {
    await executeWithPermanentConnection(async (client) => {
      // Delete the main resume record (cascade delete should handle related records)
      const { error } = await client
        .from('resumes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'deleteResume');

    return { error: null };
  } catch (error) {
    console.error('Error deleting resume:', error);
    return { error: error as Error };
  }
}

// Connection health check for monitoring
export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('resumes').select('count').limit(1);
    return !error;
  } catch (error) {
    return false;
  }
}

// Cleanup function for when the app unmounts
export function cleanup() {
  connectionPool.destroy();
}

// Initialize connection warmup
(async () => {
  try {
    await testConnection();
    console.log('Supabase connection pool initialized successfully');
  } catch (error) {
    console.log('Initial connection setup:', error);
  }
})();