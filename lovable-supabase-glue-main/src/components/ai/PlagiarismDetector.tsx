import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlagiarismResult {
  overall_similarity: number;
  risk_level: 'low' | 'medium' | 'high';
  sources_found: Array<{
    url: string;
    title: string;
    similarity_percentage: number;
    matched_text: string;
  }>;
  suspicious_patterns: string[];
  recommendations: string[];
}

interface PlagiarismDetectorProps {
  content: string;
  assignmentTitle: string;
  onResultGenerated: (result: PlagiarismResult) => void;
  className?: string;
}

export const PlagiarismDetector: React.FC<PlagiarismDetectorProps> = ({
  content,
  assignmentTitle,
  onResultGenerated,
  className
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PlagiarismResult | null>(null);
  const { toast } = useToast();

  const runPlagiarismCheck = async () => {
    setIsScanning(true);
    
    try {
      // Simulate plagiarism detection - In production, this would call a plagiarism API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock plagiarism detection results
      const similarity = Math.floor(Math.random() * 30) + 5; // 5-35% similarity
      const riskLevel: 'low' | 'medium' | 'high' = 
        similarity < 15 ? 'low' : similarity < 25 ? 'medium' : 'high';
      
      const result: PlagiarismResult = {
        overall_similarity: similarity,
        risk_level: riskLevel,
        sources_found: similarity > 15 ? [
          {
            url: "https://example-academic-source.com/article-123",
            title: "Understanding Educational Technology Trends",
            similarity_percentage: 12,
            matched_text: "The integration of technology in modern education..."
          },
          {
            url: "https://education-journal.com/study-456",
            title: "Digital Learning Environments and Student Engagement",
            similarity_percentage: 8,
            matched_text: "Students demonstrate higher engagement levels when..."
          }
        ] : [],
        suspicious_patterns: similarity > 20 ? [
          "Unusual sentence structure patterns detected",
          "Inconsistent writing style in certain paragraphs",
          "Potential text replacement patterns found"
        ] : [],
        recommendations: [
          "Review citation format for all sources",
          "Ensure proper attribution for referenced material",
          "Consider paraphrasing identical phrases",
          "Add quotation marks for direct quotes"
        ]
      };

      setScanResult(result);
      onResultGenerated(result);
      
      toast({
        title: "Plagiarism Check Complete",
        description: `Scan completed with ${similarity}% similarity detected.`,
      });
    } catch (error) {
      console.error('Plagiarism detection error:', error);
      toast({
        title: "Error",
        description: "Failed to complete plagiarism check. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'low': return 'default';
      case 'medium': return 'outline';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Smart Plagiarism Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scanResult ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Check "{assignmentTitle}" for potential plagiarism
              </p>
              <Button 
                onClick={runPlagiarismCheck} 
                disabled={isScanning || !content.trim()}
                className="min-w-[200px]"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning Content...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Run Plagiarism Check
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Results */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Similarity Score</h3>
                    <p className="text-sm text-muted-foreground">Overall content match</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getRiskColor(scanResult.risk_level)}`}>
                      {scanResult.overall_similarity}%
                    </div>
                    <Badge variant={getRiskBadgeVariant(scanResult.risk_level)} className="mt-1">
                      {getRiskIcon(scanResult.risk_level)}
                      <span className="ml-1 capitalize">{scanResult.risk_level} Risk</span>
                    </Badge>
                  </div>
                </div>
                <Progress value={scanResult.overall_similarity} className="h-2" />
              </div>

              {/* Risk Assessment Alert */}
              <Alert className={
                scanResult.risk_level === 'high' ? 'border-red-200 bg-red-50' :
                scanResult.risk_level === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {scanResult.risk_level === 'high' && 
                    "High similarity detected. Manual review recommended to verify originality."
                  }
                  {scanResult.risk_level === 'medium' && 
                    "Moderate similarity found. Check citations and ensure proper attribution."
                  }
                  {scanResult.risk_level === 'low' && 
                    "Low similarity detected. Content appears to be largely original."
                  }
                </AlertDescription>
              </Alert>

              {/* Sources Found */}
              {scanResult.sources_found.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Similar Sources Found</h4>
                  <div className="space-y-3">
                    {scanResult.sources_found.map((source, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{source.title}</h5>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {source.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {source.similarity_percentage}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                          "{source.matched_text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspicious Patterns */}
              {scanResult.suspicious_patterns.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Suspicious Patterns
                  </h4>
                  <ul className="space-y-1">
                    {scanResult.suspicious_patterns.map((pattern, index) => (
                      <li key={index} className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                        • {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {scanResult.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                      • {recommendation}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setScanResult(null)}
                  className="flex-1"
                >
                  Run New Check
                </Button>
                <Button 
                  onClick={() => onResultGenerated(scanResult)}
                  className="flex-1"
                >
                  Accept Results
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};