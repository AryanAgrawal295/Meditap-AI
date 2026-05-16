import { useRef, useEffect, useState } from 'react';
import { Camera, X, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

type ScannerMode = 'init' | 'scanning' | 'preview' | 'ready';

export function DocumentScanner({ onCapture, onClose, isProcessing = false }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<ScannerMode>('init');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const initializeCamera = async () => {
      try {
        setMode('scanning');
        setError(null);

        // Request camera with document capture constraints if available
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
        setError(errorMessage);
        setMode('init');

        // Fallback: allow file upload
        setTimeout(() => {
          setMode('ready');
        }, 500);
      }
    };

    initializeCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError('Camera not ready. Please wait...');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Failed to get canvas context');
        return;
      }

      // Flip horizontally for front camera (if needed)
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageData);
      setMode('preview');

      // Stop video to save resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture image');
    }
  };

  const retakePhoto = async () => {
    setCapturedImage(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }

      setMode('scanning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart camera');
    }
  };

  const confirmCapture = async () => {
    if (!capturedImage) return;

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `document-scan-${timestamp}.jpg`, {
        type: 'image/jpeg',
      });

      onCapture(file);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;

      const capabilities = (videoTrack.getCapabilities as any)?.();

      if (capabilities?.torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !isFlashOn }],
        } as any);

        setIsFlashOn(!isFlashOn);
      }
    } catch (err) {
      console.warn('Flash not supported:', err);
    }
  };

  if (mode === 'init' && !error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-lg text-foreground">Initializing Camera...</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center justify-center py-8">
            <div className="animate-spin">
              <Camera size={32} className="text-primary" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Please allow camera access to scan documents
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'scanning' && !error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl">
          {/* Camera Feed */}
          <div className="relative rounded-lg overflow-hidden border border-border bg-black">
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover"
              playsInline
            />

            {/* Scanning Frame Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-4/5 h-3/4 border-2 border-primary rounded-lg">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary" />

                {/* Scanning animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Camera size={24} className="mx-auto mb-2 opacity-70" />
                    <p className="text-xs font-medium opacity-70">Position document</p>
                  </div>
                </div>

                {/* Animated line */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse top-1/4" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="outline" onClick={toggleFlash} disabled={!isCameraReady}>
              {isFlashOn ? '💡 Flash On' : '🔦 Flash Off'}
            </Button>

            <Button
              variant="medical"
              size="lg"
              onClick={captureImage}
              disabled={!isCameraReady}
              className="px-8"
            >
              <Camera size={18} />
              Capture
            </Button>

            <Button variant="outline" onClick={onClose}>
              <X size={18} />
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Position the document in the frame, ensure good lighting, and keep the camera steady
          </p>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (mode === 'preview' && capturedImage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl">
          <div className="rounded-lg overflow-hidden border border-border bg-card shadow-lg">
            {/* Preview Image */}
            <img src={capturedImage} alt="Scanned document" className="w-full aspect-video object-cover" />

            {/* Preview Controls */}
            <div className="p-6 border-t border-border bg-card">
              <p className="text-sm font-medium text-foreground mb-4">Review captured document</p>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  disabled={isProcessing}
                >
                  <RefreshCw size={18} />
                  Retake
                </Button>

                <Button
                  variant="medical"
                  size="lg"
                  onClick={confirmCapture}
                  disabled={isProcessing}
                  className="px-8"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  <X size={18} />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display text-lg text-foreground">Camera Error</h2>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <p className="text-xs text-muted-foreground mt-3">
                You can still upload a document manually using the file upload option.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="medical" onClick={() => setMode('ready')}>
              Use File Upload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
