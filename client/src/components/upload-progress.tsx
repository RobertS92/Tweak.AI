import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { FileUp, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  progress: number;
  status: 'uploading' | 'analyzing' | 'complete' | 'error';
  fileName?: string;
}

export function UploadProgress({ progress, status, fileName }: UploadProgressProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'text-blue-500';
      case 'analyzing':
        return 'text-yellow-500';
      case 'complete':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'analyzing':
        return 'Analyzing resume...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <FileUp className="w-6 h-6 animate-bounce" />;
      case 'analyzing':
        return <RefreshCw className="w-6 h-6 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-6 h-6" />;
      case 'error':
        return <RefreshCw className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center p-6 bg-white rounded-lg shadow-lg"
    >
      <div className={cn("mb-4", getStatusColor())}>
        {getStatusIcon()}
      </div>
      <div className="w-full max-w-xs mb-4">
        <Progress value={progress} className="h-2" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 mb-1">
          {getStatusText()}
        </p>
        {fileName && (
          <p className="text-xs text-gray-500">
            {fileName}
          </p>
        )}
      </div>
    </motion.div>
  );
}
