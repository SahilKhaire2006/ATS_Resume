import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Resume } from '../types';

// Initialize Supabase client with proper configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are missing. Please connect to Supabase from the StackBlitz interface.');
}

// Create Supabase client with optimized settings for connection handling
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Disable session persistence for better performance
    autoRefreshToken: false, // Disable auto refresh since we're not using auth
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-my-custom-header': 'ats-resume-builder',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
};

// Exponential backoff delay calculation
function calculateDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

// Generic retry wrapper for Supabase operations
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Log the attempt
      console.warn(`${operationName} attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt === RETRY_CONFIG.maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      const isRetryable = 
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('refused') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504');
      
      if (!isRetryable) {
        throw error;
      }
      
      // Wait before retrying
      const delay = calculateDelay(attempt);
      console.log(`Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Health check function to test connection
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('resumes').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// Resume database functions with retry logic
export async function saveResume(resume: Resume): Promise<{ id: string; error: Error | null }> {
  return withRetry(async () => {
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
    const { error: resumeError } = await supabase
      .from('resumes')
      .upsert(resumeData, { onConflict: 'id' });

    if (resumeError) throw resumeError;

    // Handle experience records
    if (resume.experience && resume.experience.length > 0) {
      // First, delete existing experience records for this resume
      const { error: deleteExpError } = await supabase
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

      const { error: expError } = await supabase
        .from('resume_experiences')
        .insert(experienceData);

      if (expError) throw expError;
    }

    // Handle education records
    if (resume.education && resume.education.length > 0) {
      // First, delete existing education records for this resume
      const { error: deleteEduError } = await supabase
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

      const { error: eduError } = await supabase
        .from('resume_education')
        .insert(educationData);

      if (eduError) throw eduError;
    }

    // Handle certification records
    if (resume.certifications && resume.certifications.length > 0) {
      // First, delete existing certification records for this resume
      const { error: deleteCertError } = await supabase
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

      const { error: certError } = await supabase
        .from('resume_certifications')
        .insert(certificationData);

      if (certError) throw certError;
    }

    return { id: resumeId, error: null };
  }, 'saveResume').catch(error => {
    console.error('Error saving resume:', error);
    return { id: '', error: error as Error };
  });
}

export async function getResume(id: string): Promise<{ resume: Resume | null; error: Error | null }> {
  return withRetry(async () => {
    // Get the main resume data
    const { data: resumeData, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single();

    if (resumeError) throw resumeError;
    if (!resumeData) throw new Error('Resume not found');

    // Get experience data
    const { data: experienceData, error: expError } = await supabase
      .from('resume_experiences')
      .select('*')
      .eq('resume_id', id)
      .order('order_index', { ascending: true });

    if (expError) throw expError;

    // Get education data
    const { data: educationData, error: eduError } = await supabase
      .from('resume_education')
      .select('*')
      .eq('resume_id', id)
      .order('order_index', { ascending: true });

    if (eduError) throw eduError;

    // Get certification data
    const { data: certificationData, error: certError } = await supabase
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

    return { resume, error: null };
  }, 'getResume').catch(error => {
    console.error('Error fetching resume:', error);
    return { resume: null, error: error as Error };
  });
}

export async function getAllResumes(): Promise<{ resumes: Resume[]; error: Error | null }> {
  return withRetry(async () => {
    // Get all resumes with their basic information
    const { data: resumesData, error: resumesError } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false });

    if (resumesError) throw resumesError;

    // Fetch related data for each resume
    const resumes = await Promise.all(resumesData.map(async (resumeData) => {
      // Get experience data
      const { data: experienceData } = await supabase
        .from('resume_experiences')
        .select('*')
        .eq('resume_id', resumeData.id)
        .order('order_index', { ascending: true });

      // Get education data
      const { data: educationData } = await supabase
        .from('resume_education')
        .select('*')
        .eq('resume_id', resumeData.id)
        .order('order_index', { ascending: true });

      // Get certification data
      const { data: certificationData } = await supabase
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

    return { resumes, error: null };
  }, 'getAllResumes').catch(error => {
    console.error('Error fetching all resumes:', error);
    return { resumes: [], error: error as Error };
  });
}

export async function deleteResume(id: string): Promise<{ error: Error | null }> {
  return withRetry(async () => {
    // Delete the main resume record (cascade delete should handle related records)
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  }, 'deleteResume').catch(error => {
    console.error('Error deleting resume:', error);
    return { error: error as Error };
  });
}