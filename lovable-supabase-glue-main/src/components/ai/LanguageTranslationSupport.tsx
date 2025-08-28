import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Languages, 
  ArrowLeftRight, 
  Volume2, 
  Copy, 
  Download,
  Loader2,
  Globe,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranslationResult {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence_score: number;
  detected_language?: string;
  alternative_translations?: string[];
}

interface LanguageTranslationProps {
  defaultText?: string;
  onTranslationComplete?: (result: TranslationResult) => void;
  className?: string;
}

export const LanguageTranslationSupport: React.FC<LanguageTranslationProps> = ({
  defaultText = '',
  onTranslationComplete,
  className
}) => {
  const [sourceText, setSourceText] = useState(defaultText);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [alternativeTranslations, setAlternativeTranslations] = useState<string[]>([]);
  const { toast } = useToast();

  const languages = [
    { code: 'auto', name: 'Auto-detect', flag: '🌐' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
    { code: 'da', name: 'Danish', flag: '🇩🇰' },
    { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
    { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
    { code: 'pl', name: 'Polish', flag: '🇵🇱' },
    { code: 'cs', name: 'Czech', flag: '🇨🇿' },
    { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
    { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
    { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
    { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
    { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
    { code: 'sl', name: 'Slovenian', flag: '🇸🇮' }
  ];

  const translateText = async () => {
    if (!sourceText.trim()) {
      toast({
        title: "No Text to Translate",
        description: "Please enter some text to translate.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    
    try {
      // Simulate translation API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock translation logic
      const detectedLang = sourceLanguage === 'auto' ? 'es' : sourceLanguage;
      const mockConfidence = Math.floor(Math.random() * 20) + 80; // 80-100%
      
      // Simple mock translations for demonstration
      const translations: { [key: string]: string } = {
        'hello': 'hola',
        'goodbye': 'adiós',
        'thank you': 'gracias',
        'please': 'por favor',
        'yes': 'sí',
        'no': 'no',
        'water': 'agua',
        'food': 'comida',
        'house': 'casa',
        'school': 'escuela',
        'student': 'estudiante',
        'teacher': 'profesor',
        'assignment': 'tarea',
        'homework': 'deberes',
        'education': 'educación'
      };
      
      // Generate mock translation
      let mockTranslation = sourceText.toLowerCase();
      Object.entries(translations).forEach(([en, es]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        mockTranslation = mockTranslation.replace(regex, es);
      });
      
      // If no translations found, create a realistic mock
      if (mockTranslation === sourceText.toLowerCase()) {
        mockTranslation = `[Translated to ${targetLanguage.toUpperCase()}] ${sourceText}`;
      }
      
      const result: TranslationResult = {
        original_text: sourceText,
        translated_text: mockTranslation,
        source_language: detectedLang,
        target_language: targetLanguage,
        confidence_score: mockConfidence,
        detected_language: sourceLanguage === 'auto' ? detectedLang : undefined,
        alternative_translations: [
          `Alternative 1: ${mockTranslation} (variant)`,
          `Alternative 2: ${mockTranslation} (formal)`,
          `Alternative 3: ${mockTranslation} (casual)`
        ]
      };
      
      setTranslatedText(result.translated_text);
      setDetectedLanguage(result.detected_language || '');
      setConfidence(result.confidence_score);
      setAlternativeTranslations(result.alternative_translations || []);
      
      onTranslationComplete?.(result);
      
      toast({
        title: "Translation Complete",
        description: `Translated with ${mockConfidence}% confidence.`,
      });
      
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Failed",
        description: "Failed to translate text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const swapLanguages = () => {
    if (sourceLanguage !== 'auto') {
      const temp = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(temp);
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard.",
    });
  };

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  };

  const downloadTranslation = () => {
    const content = `Original (${sourceLanguage}): ${sourceText}\n\nTranslated (${targetLanguage}): ${translatedText}\n\nConfidence: ${confidence}%\nTranslated on: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code.toUpperCase();
  };

  const getLanguageFlag = (code: string) => {
    return languages.find(lang => lang.code === code)?.flag || '🌐';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Language Translation Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <select 
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              {detectedLanguage && (
                <Badge variant="outline" className="text-xs">
                  Detected: {getLanguageFlag(detectedLanguage)} {getLanguageName(detectedLanguage)}
                </Badge>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={swapLanguages}
                disabled={sourceLanguage === 'auto'}
                className="rounded-full"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {languages.filter(lang => lang.code !== 'auto').map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* Translation Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Text */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Original Text
                </h4>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakText(sourceText, sourceLanguage)}
                    disabled={!sourceText.trim()}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(sourceText)}
                    disabled={!sourceText.trim()}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter text to translate..."
                className="min-h-[150px] resize-none"
              />
              <div className="text-xs text-muted-foreground">
                {sourceText.length} characters
              </div>
            </div>

            {/* Translated Text */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Translation
                  {confidence > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {confidence}% confidence
                    </Badge>
                  )}
                </h4>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakText(translatedText, targetLanguage)}
                    disabled={!translatedText.trim()}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(translatedText)}
                    disabled={!translatedText.trim()}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTranslation}
                    disabled={!translatedText.trim()}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                placeholder="Translation will appear here..."
                className="min-h-[150px] resize-none bg-muted/50"
                readOnly
              />
              <div className="text-xs text-muted-foreground">
                {translatedText.length} characters
              </div>
            </div>
          </div>

          {/* Translate Button */}
          <div className="text-center">
            <Button 
              onClick={translateText}
              disabled={isTranslating || !sourceText.trim()}
              className="min-w-[150px]"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="mr-2 h-4 w-4" />
                  Translate
                </>
              )}
            </Button>
          </div>

          {/* Alternative Translations */}
          {alternativeTranslations.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <h4 className="font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Alternative Translations
              </h4>
              <div className="space-y-2">
                {alternativeTranslations.map((alt, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{alt}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(alt)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Tips */}
          <Alert>
            <Languages className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Translation Tips:</strong> For best results, use complete sentences and proper grammar. 
              The translation quality depends on context and complexity. Always review translations for accuracy, 
              especially for important academic content.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};