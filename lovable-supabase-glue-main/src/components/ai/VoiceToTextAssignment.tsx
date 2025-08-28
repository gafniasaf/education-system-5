import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Languages,
  FileText,
  Download,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceToTextProps {
  onTranscriptionUpdate: (text: string) => void;
  onTranscriptionComplete: (finalText: string) => void;
  placeholder?: string;
  className?: string;
}

export const VoiceToTextAssignment: React.FC<VoiceToTextProps> = ({
  onTranscriptionUpdate,
  onTranscriptionComplete,
  placeholder = "Your transcribed text will appear here...",
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [confidence, setConfidence] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage;
      
      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence || 0.8;
          
          if (event.results[i].isFinal) {
            final += transcript;
            setConfidence(confidence * 100);
          } else {
            interim += transcript;
          }
        }
        
        if (final) {
          const newText = transcribedText + final + ' ';
          setTranscribedText(newText);
          onTranscriptionUpdate(newText);
        }
        
        setInterimText(interim);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Speech Recognition Error",
          description: "There was an issue with speech recognition. Please try again.",
          variant: "destructive",
        });
        setIsRecording(false);
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [selectedLanguage, transcribedText, onTranscriptionUpdate, toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Setup audio level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start media recorder for audio storage
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.lang = selectedLanguage;
        recognitionRef.current.start();
      }
      
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer and audio level monitoring
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
        
        // Monitor audio levels
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone. Your speech will be transcribed in real-time.",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice-to-text feature.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Stop all media tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      setAudioLevel(0);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Process final transcription
      const finalText = transcribedText + interimText;
      if (finalText.trim()) {
        onTranscriptionComplete(finalText.trim());
        toast({
          title: "Transcription Complete",
          description: `Successfully transcribed ${finalText.split(' ').length} words.`,
        });
      }
      
      setInterimText('');
    }
  };

  const clearTranscription = () => {
    setTranscribedText('');
    setInterimText('');
    setConfidence(0);
    onTranscriptionUpdate('');
  };

  const downloadTranscription = () => {
    const text = transcribedText + interimText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-PT', name: 'Portuguese' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' }
  ];

  const currentText = transcribedText + interimText;
  const wordCount = currentText.trim() ? currentText.trim().split(' ').length : 0;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice-to-Text for Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <span className="text-sm font-medium">Language:</span>
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-sm border rounded px-2 py-1"
              disabled={isRecording}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Recording Controls */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                className={`min-w-[120px] ${isRecording ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                {isRecording ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>
              
              {currentText && (
                <>
                  <Button variant="outline" onClick={clearTranscription}>
                    Clear
                  </Button>
                  <Button variant="outline" onClick={downloadTranscription}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </>
              )}
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <Badge variant="destructive" className="animate-pulse">
                    <Mic className="mr-1 h-3 w-3" />
                    Recording
                  </Badge>
                  <span className="font-mono">{formatDuration(recordingDuration)}</span>
                </div>
                
                {/* Audio Level Indicator */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Audio Level</div>
                  <Progress value={(audioLevel / 255) * 100} className="h-2" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Transcription Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcription
              </h4>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{wordCount} words</span>
                {confidence > 0 && (
                  <Badge variant="outline">
                    {confidence.toFixed(0)}% confidence
                  </Badge>
                )}
              </div>
            </div>

            <Textarea
              value={currentText}
              onChange={(e) => {
                setTranscribedText(e.target.value);
                onTranscriptionUpdate(e.target.value);
              }}
              placeholder={placeholder}
              className="min-h-[200px] font-mono text-sm"
            />

            {interimText && (
              <Alert>
                <Volume2 className="h-4 w-4" />
                <AlertDescription>
                  <span className="text-muted-foreground">Processing: </span>
                  <span className="italic text-blue-600">{interimText}</span>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Feature Info */}
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Tips for better accuracy:</strong> Speak clearly, use punctuation commands ("period", "comma", "new paragraph"), 
              and ensure you're in a quiet environment. The system supports real-time transcription and editing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};