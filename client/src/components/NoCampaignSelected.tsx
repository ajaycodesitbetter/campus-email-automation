import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderPlus, ArrowRight } from "lucide-react";

interface NoCampaignSelectedProps {
  action: "upload" | "compose";
  onCreateCampaign?: () => void;
}

export default function NoCampaignSelected({ action, onCreateCampaign }: NoCampaignSelectedProps) {

  const actionTexts = {
    upload: {
      title: "Ready to Upload Student Data?",
      subtitle: "Select a Campaign to Get Started",
      description: "Choose an existing campaign or create a new one to begin uploading your student data and organizing your email campaigns.",
      buttonText: "Create New Campaign",
      icon: "📚"
    },
    compose: {
      title: "Ready to Compose Emails?",
      subtitle: "Select a Campaign to Get Started", 
      description: "Choose an existing campaign or create a new one to start composing personalized emails for your students.",
      buttonText: "Create New Campaign",
      icon: "✍️"
    }
  };

  const currentAction = actionTexts[action];

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-lg">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating circles */}
        <div className="absolute top-12 right-12 w-20 h-20 bg-blue-100 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute bottom-12 left-12 w-16 h-16 bg-purple-100 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
      </div>

      <CardContent className="relative z-10 p-8 text-center">
        {/* Main Icon with animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-30"></div>
            <div className="relative bg-white rounded-full p-4 shadow-lg">
              <div className="text-4xl mb-2 animate-bounce">
                {currentAction.icon}
              </div>
              <FolderPlus className="h-8 w-8 text-blue-500 mx-auto" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 animate-pulse">
              {currentAction.title}
            </h2>
            <h3 className="text-lg font-semibold text-blue-600 mb-3 flex items-center justify-center gap-2">
              <span>{currentAction.subtitle}</span>
              <ArrowRight className="h-5 w-5 animate-pulse" />
            </h3>
          </div>

          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
            {currentAction.description}
          </p>

          {/* Action buttons */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 transition-all duration-200 hover:scale-105"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Select Campaign
              </Button>
              
              {onCreateCampaign && (
                <Button 
                  onClick={onCreateCampaign}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  {currentAction.buttonText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            <div className="text-xs text-gray-500 mt-4">
              💡 <span className="italic">Tip: Use the sidebar to select an existing campaign or create a new one</span>
            </div>
          </div>
        </div>

        {/* Gradient border animation */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 opacity-0 hover:opacity-20 transition-opacity duration-500 -z-10"></div>
      </CardContent>
    </Card>
  );
}
