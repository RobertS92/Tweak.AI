import { motion } from "framer-motion";
import { Check, Loader2, FileText, Cpu, ChartBar } from "lucide-react";

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ResumeProcessingAnimationProps {
  currentStep: number;
  processCompleted: boolean;
  overallProgress: number;
}

export default function ResumeProcessingAnimation({
  currentStep,
  processCompleted,
  overallProgress
}: ResumeProcessingAnimationProps) {
  const steps: ProcessingStep[] = [
    {
      id: "upload",
      title: "Document Upload",
      description: "Uploading your resume to our secure servers",
      icon: <FileText className="h-6 w-6" />
    },
    {
      id: "parse",
      title: "Parsing Content",
      description: "Extracting and structuring your resume information",
      icon: <Cpu className="h-6 w-6" />
    },
    {
      id: "analyze",
      title: "AI Analysis",
      description: "Running deep analysis on content and format",
      icon: <ChartBar className="h-6 w-6" />
    },
    {
      id: "enhance",
      title: "Enhancing Resume",
      description: "Applying AI-powered improvements to your resume",
      icon: <Cpu className="h-6 w-6" />
    }
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Resume Processing</h3>
          <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <motion.div 
            className="bg-primary h-2.5 rounded-full" 
            initial={{ width: "0%" }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {index < currentStep ? (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              ) : index === currentStep ? (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-5 w-5 text-blue-600" />
                  </motion.div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <div className="h-5 w-5 text-gray-400">
                    {step.icon}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h4 className={`text-sm font-medium ${
                index < currentStep 
                  ? "text-green-600" 
                  : index === currentStep 
                    ? "text-blue-600" 
                    : "text-gray-500"
              }`}>
                {step.title}
              </h4>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {processCompleted && (
        <motion.div 
          className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-600">Processing Complete</h4>
              <p className="text-xs text-green-500">Your resume has been fully optimized</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}