import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, AlertCircle } from "lucide-react";

export interface IntakeConfirmedPayload {
  medicineId: string;
  scheduledTime: string;
  takenAt: string;
  method: "camera";
}

interface PillDetectorProps {
  medicineId: string;
  scheduledTime: string;
  onIntakeConfirmed: (payload: IntakeConfirmedPayload) => void;
  onCancel?: () => void;
}

type Phase = "idle" | "detecting" | "holding" | "confirmed" | "error";
type IntakeStep = "detectPillInHand" | "placeHandOnMouth" | "openHand";

type Landmark = {
  x: number;
  y: number;
};

type HandsResults = {
  multiHandLandmarks?: Landmark[][];
};

type HandsApi = {
  setOptions: (options: {
    maxNumHands: number;
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: HandsResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
};

type CameraApi = {
  start: () => Promise<void>;
  stop: () => void;
};

type HandsConstructor = new (options: { locateFile: (file: string) => string }) => HandsApi;
type CameraConstructor = new (
  video: HTMLVideoElement,
  options: { onFrame: () => Promise<void>; width: number; height: number }
) => CameraApi;

type MediaPipeWindow = Window & {
  Hands?: HandsConstructor;
  Camera?: CameraConstructor;
};

export default function PillDetector({
  medicineId,
  scheduledTime,
  onIntakeConfirmed,
  onCancel,
}: PillDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<HandsApi | null>(null);
  const cameraRef = useRef<CameraApi | null>(null);
  const stepStartedAtRef = useRef<number | null>(null);
  const pillHeldAtRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const intakeStepRef = useRef<IntakeStep>("detectPillInHand");
  const nearMouthAtRef = useRef<number | null>(null);
  const lastNearMouthAtRef = useRef<number | null>(null);
  const releaseAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("Step 1: hold the pill between thumb and index finger");
  const PILL_HOLD_MS = 350;
  const MOUTH_HOLD_MS = 350;
  const RELEASE_HOLD_MS = 300;
  const STEP_TIMEOUT_MS = 7000;
  const MOUTH_RELEASE_GRACE_MS = 1200;

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, facingMode: "user" },
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const handsModule = await import("@mediapipe/hands");
      const cameraModule = await import("@mediapipe/camera_utils");
      const Hands =
        (handsModule as { Hands?: HandsConstructor }).Hands ??
        (handsModule.default as { Hands?: HandsConstructor } | undefined)?.Hands ??
        (window as MediaPipeWindow).Hands;
      const MediaPipeCamera =
        (cameraModule as { Camera?: CameraConstructor }).Camera ??
        (cameraModule.default as { Camera?: CameraConstructor } | undefined)?.Camera ??
        (window as MediaPipeWindow).Camera;

      if (!Hands || !MediaPipeCamera) {
        throw new Error("MediaPipe camera verification failed to load");
      }

      handsRef.current = new Hands({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });
      handsRef.current.onResults(onResults);

      cameraRef.current = new MediaPipeCamera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current)
            await handsRef.current.send({ image: videoRef.current });
        },
        width: 640,
        height: 360,
      });
      await cameraRef.current.start();
      confirmedRef.current = false;
      intakeStepRef.current = "detectPillInHand";
      stepStartedAtRef.current = Date.now();
      pillHeldAtRef.current = null;
      nearMouthAtRef.current = null;
      lastNearMouthAtRef.current = null;
      releaseAtRef.current = null;
      setPhase("detecting");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Camera access denied");
      setPhase("error");
    }
  }

  function stopCamera() {
    cameraRef.current?.stop();
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    }
  }

  function pinchDist(lm: Landmark[]) {
    const t = lm[4], i = lm[8];
    return Math.sqrt((t.x - i.x) ** 2 + (t.y - i.y) ** 2);
  }

  function distance(a: Landmark, b: Landmark) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function confirmIntake() {
    if (confirmedRef.current) return;

    confirmedRef.current = true;
    setPhase("confirmed");
    stopCamera();
    onIntakeConfirmed({
      medicineId,
      scheduledTime,
      takenAt: new Date().toISOString(),
      method: "camera",
    });
  }

  function onResults(results: HandsResults) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks?.length) {
      const wasRecentlyNearMouth =
        lastNearMouthAtRef.current !== null &&
        Date.now() - lastNearMouthAtRef.current < MOUTH_RELEASE_GRACE_MS;

      if (intakeStepRef.current === "openHand" && wasRecentlyNearMouth) {
        if (!releaseAtRef.current) releaseAtRef.current = Date.now();
        const releaseElapsed = Date.now() - releaseAtRef.current;
        setProgress(Math.min(75 + (releaseElapsed / RELEASE_HOLD_MS) * 25, 100));
        setHint("Release detected");

        if (releaseElapsed >= RELEASE_HOLD_MS) {
          confirmIntake();
        }
      } else {
        pillHeldAtRef.current = null;
        setProgress(0);
        setHint("Show your hand clearly in the camera");
      }
      return;
    }

    const lm = results.multiHandLandmarks[0];

    // Draw landmarks
    ctx.fillStyle = "#1D9E75";
    lm.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const palmBase = lm[0];
    const indexBase = lm[5];
    const middleBase = lm[9];
    const ringBase = lm[13];
    const handScale = Math.max(distance(palmBase, middleBase), 0.12);
    const pinchDistance = pinchDist(lm);
    const thumbToMiddle = distance(thumbTip, middleTip);
    const thumbIndexRatio = pinchDistance / handScale;
    const thumbMiddleRatio = thumbToMiddle / handScale;
    const curledFingerCount = [indexTip, middleTip, ringTip].filter(
      (tip, index) => {
        const base = [indexBase, middleBase, ringBase][index];
        return distance(tip, palmBase) < distance(base, palmBase) * 1.25;
      }
    ).length;
    const isPinching = thumbIndexRatio < 0.82 || thumbMiddleRatio < 0.82;
    const isClosedGrip = curledFingerCount >= 2 && (thumbIndexRatio < 1.18 || thumbMiddleRatio < 1.18);
    const isHoldingMedicine = isPinching || isClosedGrip;
    const isReleased = thumbIndexRatio > 1.18 && thumbMiddleRatio > 1.18 && curledFingerCount === 0;
    const pinchCenterX = (thumbTip.x + indexTip.x) / 2;
    const pinchCenterY = (thumbTip.y + indexTip.y) / 2;
    const mouthZoneLeft = 0.22;
    const mouthZoneRight = 0.78;
    const mouthZoneTop = 0.22;
    const mouthZoneBottom = 0.68;
    const isHandOnMouth =
      pinchCenterX >= mouthZoneLeft &&
      pinchCenterX <= mouthZoneRight &&
      pinchCenterY >= mouthZoneTop &&
      pinchCenterY <= mouthZoneBottom;

    if (isHandOnMouth) {
      lastNearMouthAtRef.current = Date.now();
    }

    ctx.strokeStyle = isHandOnMouth ? "#1D9E75" : "#F59E0B";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(
      mouthZoneLeft * canvas.width,
      mouthZoneTop * canvas.height,
      (mouthZoneRight - mouthZoneLeft) * canvas.width,
      (mouthZoneBottom - mouthZoneTop) * canvas.height,
    );
    ctx.setLineDash([]);

    // Draw grip highlight
    if (isHoldingMedicine) {
      const cx = pinchCenterX * canvas.width;
      const cy = pinchCenterY * canvas.height;
      ctx.beginPath();
      ctx.arc(cx, cy, isClosedGrip ? 24 : 18, 0, 2 * Math.PI);
      ctx.strokeStyle = "#1D9E75";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (intakeStepRef.current === "detectPillInHand") {
      nearMouthAtRef.current = null;
      lastNearMouthAtRef.current = null;
      releaseAtRef.current = null;

      if (isHoldingMedicine) {
        if (!pillHeldAtRef.current) pillHeldAtRef.current = Date.now();
        const pillHeldElapsed = Date.now() - pillHeldAtRef.current;
        setProgress(Math.min((pillHeldElapsed / PILL_HOLD_MS) * 25, 25));
        setPhase("holding");

        if (pillHeldElapsed >= PILL_HOLD_MS) {
          intakeStepRef.current = "placeHandOnMouth";
          stepStartedAtRef.current = Date.now();
          setProgress(25);
          setHint("Step 2: pill detected, place your hand inside the mouth box");
        } else {
          setHint("Step 1: keep the pill pinched for a moment");
        }
      } else {
        pillHeldAtRef.current = null;
        setProgress(0);
        if (phase !== "confirmed") setPhase("detecting");
        setHint("Step 1: hold the pill between thumb and index finger");
      }

      return;
    }

    if (intakeStepRef.current === "placeHandOnMouth") {
      if (stepStartedAtRef.current && Date.now() - stepStartedAtRef.current > STEP_TIMEOUT_MS) {
        intakeStepRef.current = "detectPillInHand";
        stepStartedAtRef.current = Date.now();
        pillHeldAtRef.current = null;
        setProgress(0);
        setPhase("detecting");
        setHint("Try again: first show the pill held in your fingers");
        return;
      }

      if (!isHoldingMedicine && !isHandOnMouth) {
        intakeStepRef.current = "detectPillInHand";
        stepStartedAtRef.current = Date.now();
        pillHeldAtRef.current = null;
        setProgress(0);
        setPhase("detecting");
        setHint("Keep holding the pill until your hand reaches your mouth");
        return;
      }

      if (!isHoldingMedicine && isHandOnMouth && nearMouthAtRef.current) {
        intakeStepRef.current = "openHand";
        releaseAtRef.current = Date.now();
        setProgress(80);
        setPhase("holding");
        setHint("Step 3: open hand detected");
        return;
      }

      setProgress(isHandOnMouth ? 60 : 40);
      setPhase("holding");
      setHint(isHandOnMouth ? "Hand on mouth detected, hold briefly" : "Step 2: place your hand inside the mouth box");

      if (isHandOnMouth) {
        if (!nearMouthAtRef.current) nearMouthAtRef.current = Date.now();
        const mouthElapsed = Date.now() - nearMouthAtRef.current;
        setProgress(Math.min(55 + (mouthElapsed / MOUTH_HOLD_MS) * 20, 75));

        if (mouthElapsed >= MOUTH_HOLD_MS) {
          intakeStepRef.current = "openHand";
          releaseAtRef.current = null;
          setProgress(75);
          setHint("Step 3: open your hand");
        }
      } else {
        nearMouthAtRef.current = null;
      }

      return;
    }

    if (intakeStepRef.current === "openHand") {
      setPhase("holding");
      const wasRecentlyNearMouth =
        lastNearMouthAtRef.current !== null &&
        Date.now() - lastNearMouthAtRef.current < MOUTH_RELEASE_GRACE_MS;

      if (!isHandOnMouth && !wasRecentlyNearMouth && isHoldingMedicine) {
        intakeStepRef.current = "placeHandOnMouth";
        releaseAtRef.current = null;
        setProgress(50);
        setHint("Put your hand back on your mouth before opening");
        return;
      }

      if (isReleased || (wasRecentlyNearMouth && !isHoldingMedicine)) {
        if (!releaseAtRef.current) releaseAtRef.current = Date.now();
        const releaseElapsed = Date.now() - releaseAtRef.current;
        setProgress(Math.min(75 + (releaseElapsed / RELEASE_HOLD_MS) * 25, 100));
        setHint("Open hand detected");

        if (releaseElapsed >= RELEASE_HOLD_MS) {
          confirmIntake();
        }
      } else {
        releaseAtRef.current = null;
        setProgress(75);
        setHint("Step 3: open your hand after placing it on your mouth");
      }
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Video feed */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {phase === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white text-sm">Camera not started</p>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        {phase === "idle" && <Badge variant="secondary">Ready</Badge>}
        {phase === "detecting" && <Badge variant="outline" className="text-amber-600 border-amber-300">Waiting for gesture...</Badge>}
        {phase === "holding" && <Badge variant="outline" className="text-blue-600 border-blue-300">Intake motion detected</Badge>}
        {phase === "confirmed" && <Badge className="bg-emerald-500 hover:bg-emerald-500"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>}
        {phase === "error" && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />{errorMsg}</Badge>}
      </div>

      {/* Hold progress */}
      {(phase === "holding" || phase === "detecting") && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {hint}
          </p>
        </div>
      )}

      {/* Confirmed message */}
      {phase === "confirmed" && (
        <p className="text-sm text-emerald-600 font-medium text-center py-1">
          ✓ Pill intake logged to your adherence record
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        {phase === "idle" && (
          <Button onClick={startCamera} className="flex-1">
            <Camera className="w-4 h-4 mr-2" />
            Start camera verification
          </Button>
        )}
        {(phase === "detecting" || phase === "holding") && (
          <Button variant="outline" onClick={() => { stopCamera(); onCancel?.(); }} className="flex-1">
            Cancel
          </Button>
        )}
        {(phase === "confirmed" || phase === "error") && (
          <Button
            variant="outline"
            onClick={() => {
              intakeStepRef.current = "detectPillInHand";
              stepStartedAtRef.current = Date.now();
              pillHeldAtRef.current = null;
              nearMouthAtRef.current = null;
              lastNearMouthAtRef.current = null;
              releaseAtRef.current = null;
              setProgress(0);
              setHint("Step 1: hold the pill between thumb and index finger");
              setPhase("idle");
            }}
            className="flex-1"
          >
            Retake
          </Button>
        )}
      </div>
    </div>
  );
}
