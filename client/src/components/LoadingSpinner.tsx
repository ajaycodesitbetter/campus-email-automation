import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = "md", 
  text = "Loading...", 
  className = "" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <motion.div 
      className={`flex flex-col items-center justify-center space-y-3 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Spinner */}
      <div className="relative">
        <motion.div
          className={`${sizeClasses[size]} border-2 border-gray-200 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className={`absolute top-0 left-0 ${sizeClasses[size]} border-2 border-blue-500 border-t-transparent rounded-full`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Animated dots */}
      <motion.div 
        className={`${textSizeClasses[size]} text-gray-600 font-medium`}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      >
        {text}
      </motion.div>

      {/* Pulsing dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Enhanced skeleton loader for cards
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="animate-pulse">
        <div className="flex items-center space-x-4">
          <motion.div 
            className="w-12 h-12 bg-gray-200 rounded-lg"
            animate={{ backgroundColor: ["#e5e7eb", "#f3f4f6", "#e5e7eb"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="flex-1 space-y-2">
            <motion.div 
              className="h-4 bg-gray-200 rounded w-3/4"
              animate={{ backgroundColor: ["#e5e7eb", "#f3f4f6", "#e5e7eb"] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div 
              className="h-3 bg-gray-200 rounded w-1/2"
              animate={{ backgroundColor: ["#e5e7eb", "#f3f4f6", "#e5e7eb"] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </div>
        <motion.div 
          className="mt-4 h-2 bg-gray-200 rounded-full"
          animate={{ backgroundColor: ["#e5e7eb", "#f3f4f6", "#e5e7eb"] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
