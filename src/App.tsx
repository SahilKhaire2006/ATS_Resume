import React, { useState, useEffect } from 'react';
import { FileText, Upload, BarChart, Edit3, CheckCircle, AlertCircle, List } from 'lucide-react';
import ResumeUploader from './components/ResumeUploader';
import ResumeBuilder from './components/ResumeBuilder';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import ResumeList from './components/ResumeList';
import ConnectionStatus from './components/ConnectionStatus';
import { useConnectionRecovery } from './hooks/useConnectionRecovery';
import { Resume, AnalysisResult } from './types';
import { saveResume, getAllResumes, cleanup } from './lib/supabase';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'build' | 'analyze' | 'list'>('upload');
  const [resume, setResume] = useState<Resume | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize permanent connection recovery
  useConnectionRecovery({
    onConnectionActive: () => {
      // Connection is active and maintained
    }
  });

  // Load saved resumes on component mount
  useEffect(() => {
    const fetchResumes = async () => {
      const { resumes, error } = await getAllResumes();
      if (!error) {
        setSavedResumes(resumes);
      }
    };

    fetchResumes();

    // Cleanup connections on unmount
    return () => {
      cleanup();
    };
  }, []);

  const handleResumeUpload = (text: string, resumeData: Resume) => {
    setResumeText(text);
    setResume(resumeData);
    setActiveTab('analyze');
  };

  const handleResumeBuilt = async (resumeData: Resume) => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const { id, error } = await saveResume(resumeData);
      
      if (error) {
        setSaveError('Failed to save resume. Please try again.');
        console.error('Error saving resume:', error);
      } else {
        // Update the resume with the ID from the database
        const updatedResume = { ...resumeData, id };
        setResume(updatedResume);
        
        // Refresh the list of saved resumes
        const { resumes } = await getAllResumes();
        setSavedResumes(resumes);
        
        setActiveTab('analyze');
      }
    } catch (error) {
      setSaveError('An unexpected error occurred. Please try again.');
      console.error('Error in handleResumeBuilt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectResume = (selectedResume: Resume) => {
    setResume(selectedResume);
    setActiveTab('analyze');
  };

  const handleAnalyzeResume = async () => {
    if (!resume) return;
    
    setIsAnalyzing(true);
    
    // Simulate API call for analysis
    setTimeout(() => {
      const mockAnalysis: AnalysisResult = analyzeResume(resume);
      setAnalysisResult(mockAnalysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  // This is a mock analysis function - in a real app, this would call an API
  const analyzeResume = (resume: Resume): AnalysisResult => {
    let score = 0;
    const improvements: string[] = [];
    const strengths: string[] = [];
    
    // Check for contact information
    if (resume.email && resume.phone) {
      score += 10;
      strengths.push("Complete contact information provided");
    } else {
      improvements.push("Add complete contact information (email and phone)");
    }
    
    // Check for summary/objective
    if (resume.summary && resume.summary.length > 50) {
      score += 15;
      strengths.push("Strong professional summary included");
    } else {
      improvements.push("Add a compelling professional summary (50+ characters)");
    }
    
    // Check for skills
    if (resume.skills && resume.skills.length >= 5) {
      score += 15;
      strengths.push("Good range of skills listed");
    } else {
      improvements.push("List at least 5 relevant skills");
    }
    
    // Check for work experience
    if (resume.experience && resume.experience.length >= 2) {
      score += 20;
      
      // Check for quantifiable achievements
      let hasQuantifiableAchievements = false;
      for (const exp of resume.experience) {
        if (exp.description && /\d+%|\d+\s+years|\$\d+|increased|decreased|improved|reduced|achieved/i.test(exp.description)) {
          hasQuantifiableAchievements = true;
          break;
        }
      }
      
      if (hasQuantifiableAchievements) {
        score += 10;
        strengths.push("Experience includes quantifiable achievements");
      } else {
        improvements.push("Add quantifiable achievements to work experience (e.g., percentages, numbers)");
      }
    } else {
      improvements.push("Include at least 2 relevant work experiences");
    }
    
    // Check for education
    if (resume.education && resume.education.length > 0) {
      score += 10;
      strengths.push("Education details included");
    } else {
      improvements.push("Add education details");
    }
    
    // Check for keywords
    const commonKeywords = [
      "managed", "developed", "created", "implemented", "led", "coordinated", 
      "analyzed", "designed", "improved", "increased", "reduced", "achieved"
    ];
    
    const resumeContent = JSON.stringify(resume).toLowerCase();
    const keywordsFound = commonKeywords.filter(keyword => resumeContent.includes(keyword));
    
    if (keywordsFound.length >= 5) {
      score += 10;
      strengths.push("Good use of action verbs and keywords");
    } else {
      improvements.push("Use more action verbs and industry keywords");
    }
    
    // Check for certifications or additional sections
    if (resume.certifications && resume.certifications.length > 0) {
      score += 10;
      strengths.push("Certifications or additional qualifications included");
    } else {
      improvements.push("Consider adding relevant certifications or additional qualifications");
    }
    
    return {
      score,
      strengths,
      improvements
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ConnectionStatus />
      
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText size={28} />
              <h1 className="text-2xl font-bold">ATS Resume Master</h1>
            </div>
            <div className="text-sm">
              Build and analyze ATS-friendly resumes
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${
                activeTab === 'upload' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={18} className="mr-2" />
              Upload Resume
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${
                activeTab === 'build' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('build')}
            >
              <Edit3 size={18} className="mr-2" />
              Build Resume
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${
                activeTab === 'analyze' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('analyze')}
              disabled={!resume}
            >
              <BarChart size={18} className="mr-2" />
              Analyze Resume
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${
                activeTab === 'list' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('list')}
            >
              <List size={18} className="mr-2" />
              Saved Resumes
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'upload' && (
              <ResumeUploader onResumeUploaded={handleResumeUpload} />
            )}
            
            {activeTab === 'build' && (
              <ResumeBuilder 
                onResumeBuilt={handleResumeBuilt} 
                initialResume={resume} 
                isSaving={isSaving}
                saveError={saveError}
              />
            )}
            
            {activeTab === 'analyze' && (
              <ResumeAnalyzer 
                resume={resume} 
                resumeText={resumeText}
                analysisResult={analysisResult}
                isAnalyzing={isAnalyzing}
                onAnalyze={handleAnalyzeResume}
              />
            )}
            
            {activeTab === 'list' && (
              <ResumeList 
                resumes={savedResumes} 
                onSelectResume={handleSelectResume} 
              />
            )}
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 ATS Resume Master. All rights reserved.</p>
          <p className="text-gray-400 text-sm mt-2">
            Optimize your resume for Applicant Tracking Systems and land more interviews.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;