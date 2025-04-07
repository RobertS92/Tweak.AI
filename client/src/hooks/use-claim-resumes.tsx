import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Define the resume interface
interface AnonymousResume {
  id: number;
  title: string;
  atsScore: number | null;
  content: string;
  fileType: string;
  enhancedContent?: string;
  analysis?: any;
  createdAt: string;
}

/**
 * Custom hook to handle claiming anonymous resumes after login
 */
export function useClaimResumes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch anonymous resumes only if user is logged in
  const { data: anonymousResumes = [], isLoading } = useQuery<AnonymousResume[]>({
    queryKey: ['/api/resumes/anonymous'],
    enabled: !!user, // Only run if user is logged in
  });
  
  // Mutation to claim anonymous resume
  const claimResumeMutation = useMutation({
    mutationFn: async (resumeId: number) => {
      const res = await apiRequest('POST', `/api/resumes/claim/${resumeId}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh resume lists and dashboard stats
      queryClient.invalidateQueries({ queryKey: ['/api/resumes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: 'Resume claimed',
        description: 'Anonymous resume has been added to your account',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to claim resume',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Function to claim all available anonymous resumes
  const claimAllAnonymousResumes = async () => {
    if (isProcessing || !user || !(anonymousResumes && anonymousResumes.length > 0)) return;
    
    setIsProcessing(true);
    
    try {
      // Process one by one to handle potential failures individually
      for (const resume of anonymousResumes as AnonymousResume[]) {
        try {
          await claimResumeMutation.mutateAsync(resume.id);
        } catch (e) {
          console.error('Failed to claim resume:', resume.id, e);
          // Continue with next resume even if one fails
        }
      }
      
      toast({
        title: 'Resumes claimed',
        description: 'All anonymous resumes have been added to your account',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to claim a single anonymous resume
  const claimResume = async (resumeId: number) => {
    if (!user) return;
    await claimResumeMutation.mutateAsync(resumeId);
  };
  
  return {
    anonymousResumes: anonymousResumes as AnonymousResume[],
    isLoading,
    isProcessing,
    claimResume,
    claimAllAnonymousResumes
  };
}