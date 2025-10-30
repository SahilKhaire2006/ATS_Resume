import React, { useState } from 'react';
import { FileText, Edit3, Trash2, Search, AlertCircle, Award } from 'lucide-react';
import { Resume } from '../types';
import { deleteResume, getAllResumes } from '../lib/supabase';

interface ResumeListProps {
  resumes: Resume[];
  onSelectResume: (resume: Resume) => void;
}

const ResumeList: React.FC<ResumeListProps> = ({ resumes: initialResumes, onSelectResume }) => {
  const [resumes, setResumes] = useState<Resume[]>(initialResumes);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with parent component's resumes
  React.useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  const handleDeleteResume = async (id: string) => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      setIsDeleting(id);
      setError(null);
      
      try {
        const { error } = await deleteResume(id);
        
        if (error) {
          setError('Failed to delete resume. Please try again.');
          console.error('Error deleting resume:', error);
        } else {
          // Update the local state to remove the deleted resume
          setResumes(prevResumes => prevResumes.filter(resume => resume.id !== id));
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
        console.error('Error in handleDeleteResume:', err);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const refreshResumes = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const { resumes: freshResumes, error } = await getAllResumes();

      if (error) {
        setError('Failed to refresh resumes. Your session may have expired. Please reload the page.');
        console.error('Error refreshing resumes:', error);
      } else {
        setResumes(freshResumes);
        setError(null);
      }
    } catch (err) {
      setError('Connection issue detected. Please check your internet connection and try again.');
      console.error('Error in refreshResumes:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredResumes = resumes.filter(resume => {
    const searchLower = searchTerm.toLowerCase();
    return (
      resume.name?.toLowerCase().includes(searchLower) ||
      resume.summary?.toLowerCase().includes(searchLower) ||
      resume.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
      resume.experience?.some(exp => 
        exp.company.toLowerCase().includes(searchLower) || 
        exp.position.toLowerCase().includes(searchLower)
      ) ||
      resume.certifications?.some(cert =>
        cert.name.toLowerCase().includes(searchLower) ||
        cert.issuer?.toLowerCase().includes(searchLower)
      )
    );
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Saved Resumes</h2>
        
        <button
          onClick={refreshResumes}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRefreshing ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent mr-2"></div>
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search resumes by name, skills, experience, or certifications..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      {filteredResumes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Resumes Found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? "No resumes match your search criteria. Try a different search term."
              : "You haven't created any resumes yet. Build a new resume to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredResumes.map((resume) => (
              <li key={resume.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 truncate">{resume.name}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {resume.summary || 'No summary provided'}
                    </p>
                    
                    {/* Experience Section */}
                    {resume.experience && resume.experience.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Experience</h4>
                        <div className="space-y-2">
                          {resume.experience.map((exp, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium text-gray-800">{exp.position}</div>
                              <div className="text-gray-600">{exp.company}</div>
                              {(exp.startDate || exp.endDate) && (
                                <div className="text-gray-500 text-xs">
                                  {exp.startDate || 'N/A'} - {exp.endDate || 'Present'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Education Section */}
                    {resume.education && resume.education.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Education</h4>
                        <div className="space-y-2">
                          {resume.education.map((edu, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium text-gray-800">
                                {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                              </div>
                              <div className="text-gray-600">{edu.institution}</div>
                              {(edu.startDate || edu.endDate) && (
                                <div className="text-gray-500 text-xs">
                                  {edu.startDate || 'N/A'} - {edu.endDate || 'Present'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Certifications Section */}
                    {resume.certifications && resume.certifications.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Certifications</h4>
                        <div className="space-y-2">
                          {resume.certifications.map((cert, index) => (
                            <div key={index} className="text-sm flex items-start">
                              <Award size={16} className="text-indigo-500 mr-2 mt-1 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-800">{cert.name}</div>
                                {cert.issuer && <div className="text-gray-600">{cert.issuer}</div>}
                                {cert.date && <div className="text-gray-500 text-xs">{cert.date}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {resume.skills && resume.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {resume.skills.slice(0, 5).map((skill, index) => (
                          skill.trim() && (
                            <span 
                              key={index} 
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {skill}
                            </span>
                          )
                        ))}
                        {resume.skills.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            +{resume.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => onSelectResume(resume)}
                      className="inline-flex items-center p-2 border border-transparent rounded-full text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="View and analyze resume"
                    >
                      <FileText size={18} />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteResume(resume.id!)}
                      disabled={isDeleting === resume.id}
                      className="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete resume"
                    >
                      {isDeleting === resume.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeList;