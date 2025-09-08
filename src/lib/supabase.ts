import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Resume } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are missing. Please connect to Supabase from the StackBlitz interface.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Resume database functions
export async function saveResume(resume: Resume): Promise<{ id: string; error: Error | null }> {
  try {
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
      .upsert(resumeData);

    if (resumeError) throw resumeError;

    // Handle experience records
    if (resume.experience && resume.experience.length > 0) {
      // First, delete existing experience records for this resume
      await supabase
        .from('resume_experiences')
        .delete()
        .eq('resume_id', resumeId);

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
      await supabase
        .from('resume_education')
        .delete()
        .eq('resume_id', resumeId);

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
      await supabase
        .from('resume_certifications')
        .delete()
        .eq('resume_id', resumeId);

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
  } catch (error) {
    console.error('Error saving resume:', error);
    return { id: '', error: error as Error };
  }
}

export async function getResume(id: string): Promise<{ resume: Resume | null; error: Error | null }> {
  try {
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
  } catch (error) {
    console.error('Error fetching resume:', error);
    return { resume: null, error: error as Error };
  }
}

export async function getAllResumes(): Promise<{ resumes: Resume[]; error: Error | null }> {
  try {
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
  } catch (error) {
    console.error('Error fetching all resumes:', error);
    return { resumes: [], error: error as Error };
  }
}

export async function deleteResume(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting resume:', error);
    return { error: error as Error };
  }
}