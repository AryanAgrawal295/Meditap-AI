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
type IntakeStep = "detectPillInHand" | "trackPillToMouth" | "verifyPillInMouth" | "confirmTaken";

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
  const mouthEvidenceAtRef = useRef<number | null>(null);
  const releaseAtRef = useRef<number | null>(null);
  const pathStartRef = useRef<Landmark | null>(null);
  const pathStartMouthDistanceRef = useRef<number | null>(null);
  const pathMaxTravelRef = useRef(0);
  const pathReachedMouthRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("Step 1: hold the pill between thumb and index finger");
  const PILL_HOLD_MS = 650;
  const MOUTH_HOLD_MS = 550;
  const CONFIRM_HOLD_MS = 450;
  const STEP_TIMEOUT_MS = 9000;
  const MOUTH_RELEASE_GRACE_MS = 1100;
  const MIN_PATH_TRAVEL = 0.16;
  const MIN_MOUTH_APPROACH = 0.08;

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
      mouthEvidenceAtRef.current = null;
      releaseAtRef.current = null;
      pathStartRef.current = null;
      pathStartMouthDistanceRef.current = null;
      pathMaxTravelRef.current = 0;
      pathReachedMouthRef.current = false;
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

  function isPointInZone(point: Landmark, zone: { left: number; right: number; top: number; bottom: number }) {
    return (
      point.x >= zone.left &&
      point.x <= zone.right &&
      point.y >= zone.top &&
      point.y <= zone.bottom
    );
  }

  function resetVerification(message = "Step 1: hold the pill between thumb and index finger") {
    intakeStepRef.current = "detectPillInHand";
    stepStartedAtRef.current = Date.now();
    pillHeldAtRef.current = null;
    nearMouthAtRef.current = null;
    lastNearMouthAtRef.current = null;
    mouthEvidenceAtRef.current = null;
    releaseAtRef.current = null;
    pathStartRef.current = null;
    pathStartMouthDistanceRef.current = null;
    pathMaxTravelRef.current = 0;
    pathReachedMouthRef.current = false;
    setProgress(0);
    setPhase("detecting");
    setHint(message);
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
      releaseAtRef.current = null;
      if (intakeStepRef.current === "detectPillInHand") {
        pillHeldAtRef.current = null;
        setProgress(0);
      }
      if (intakeStepRef.current === "verifyPillInMouth") {
        setHint("Step 3: keep the pill at your mouth for a moment");
      } else if (intakeStepRef.current === "confirmTaken") {
        setHint("Step 4: show a thumbs up to verify");
      } else {
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
    const pinkyTip = lm[20];
    const palmBase = lm[0];
    const thumbMcp = lm[2];
    const indexBase = lm[5];
    const middleBase = lm[9];
    const ringBase = lm[13];
    const pinkyBase = lm[17];
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
    const isPinching = thumbIndexRatio < 0.55;
    const isClosedGrip = curledFingerCount >= 2 && thumbIndexRatio < 0.95 && thumbMiddleRatio < 1.05;
    const isHoldingMedicine = isPinching || isClosedGrip;
    const foldedFingersCount = [indexTip, middleTip, ringTip, pinkyTip].filter(
      (tip, index) => {
        const base = [indexBase, middleBase, ringBase, pinkyBase][index];
        return distance(tip, palmBase) < distance(base, palmBase) * 1.45 || tip.y > base.y;
      }
    ).length;
    const thumbExtendedUp = thumbTip.y < Math.min(thumbMcp.y, indexBase.y, middleBase.y) - handScale * 0.15;
    const isThumbsUp =
      thumbExtendedUp &&
      foldedFingersCount >= 3 &&
      distance(thumbTip, palmBase) > distance(thumbMcp, palmBase) * 1.1;
    const pinchCenterX = (thumbTip.x + indexTip.x) / 2;
    const pinchCenterY = (thumbTip.y + indexTip.y) / 2;
    const mouthZone = {
      left: 0.24,
      right: 0.76,
      top: 0.34,
      bottom: 0.74,
    };
    const lowerFaceZone = {
      left: 0.18,
      right: 0.82,
      top: 0.28,
      bottom: 0.8,
    };
    const pinchCenter = { x: pinchCenterX, y: pinchCenterY };
    const mouthCenter = { x: 0.5, y: 0.54 };
    const mouthCheckPoints = [
      pinchCenter,
      thumbTip,
      indexTip,
      middleTip,
      palmBase,
      middleBase,
    ];
    const fingertipNearMouth = [thumbTip, indexTip, middleTip].some((point) => isPointInZone(point, mouthZone));
    const pointsNearLowerFace = mouthCheckPoints.filter((point) => isPointInZone(point, lowerFaceZone)).length;
    const pinchNearLowerFace = isPointInZone(pinchCenter, lowerFaceZone);
    const isHandOnMouth = fingertipNearMouth && pinchNearLowerFace && pointsNearLowerFace >= 2;

    if (isHandOnMouth) {
      lastNearMouthAtRef.current = Date.now();
    }

    ctx.strokeStyle = isHandOnMouth ? "#1D9E75" : "#F59E0B";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(
      mouthZone.left * canvas.width,
      mouthZone.top * canvas.height,
      (mouthZone.right - mouthZone.left) * canvas.width,
      (mouthZone.bottom - mouthZone.top) * canvas.height,
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
      mouthEvidenceAtRef.current = null;
      releaseAtRef.current = null;
      pathStartRef.current = null;
      pathStartMouthDistanceRef.current = null;
      pathMaxTravelRef.current = 0;
      pathReachedMouthRef.current = false;

      if (isHoldingMedicine) {
        if (isHandOnMouth || isPointInZone(pinchCenter, lowerFaceZone)) {
          pillHeldAtRef.current = null;
          setProgress(0);
          setPhase("detecting");
          setHint("Start with the pill visible away from your mouth");
          return;
        }

        if (!pillHeldAtRef.current) pillHeldAtRef.current = Date.now();
        const pillHeldElapsed = Date.now() - pillHeldAtRef.current;
        setProgress(Math.min((pillHeldElapsed / PILL_HOLD_MS) * 25, 25));
        setPhase("holding");

        if (pillHeldElapsed >= PILL_HOLD_MS) {
          intakeStepRef.current = "trackPillToMouth";
          stepStartedAtRef.current = Date.now();
          pathStartRef.current = pinchCenter;
          pathStartMouthDistanceRef.current = distance(pinchCenter, mouthCenter);
          pathMaxTravelRef.current = 0;
          pathReachedMouthRef.current = false;
          setProgress(25);
          setHint("Step 2: move the held pill from here to your mouth");
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

    if (intakeStepRef.current === "trackPillToMouth") {
      if (stepStartedAtRef.current && Date.now() - stepStartedAtRef.current > STEP_TIMEOUT_MS) {
        resetVerification("Try again: show the pill first, then move it to your mouth");
        return;
      }

      if (pathStartRef.current) {
        pathMaxTravelRef.current = Math.max(pathMaxTravelRef.current, distance(pathStartRef.current, pinchCenter));
      }

      const mouthDistance = distance(pinchCenter, mouthCenter);
      const mouthApproach =
        pathStartMouthDistanceRef.current !== null
          ? pathStartMouthDistanceRef.current - mouthDistance
          : 0;
      const hasValidPath = pathMaxTravelRef.current >= MIN_PATH_TRAVEL && mouthApproach >= MIN_MOUTH_APPROACH;
      const recentlyReachedMouth =
        lastNearMouthAtRef.current !== null &&
        Date.now() - lastNearMouthAtRef.current <= MOUTH_RELEASE_GRACE_MS;

      if (!isHoldingMedicine && !recentlyReachedMouth) {
        resetVerification("Keep the pill visible until it reaches your mouth");
        return;
      }

      setProgress(isHandOnMouth && hasValidPath ? 60 : Math.min(25 + pathMaxTravelRef.current * 120, 52));
      setPhase("holding");
      setHint(
        isHandOnMouth
          ? hasValidPath
            ? "Step 3: pill reached your mouth, hold briefly"
            : "Move the pill from away position into your mouth, not directly near it"
          : "Step 2: keep holding and move the pill into the mouth box"
      );

      if (isHandOnMouth && hasValidPath) {
        intakeStepRef.current = "verifyPillInMouth";
        stepStartedAtRef.current = Date.now();
        mouthEvidenceAtRef.current = Date.now();
        setProgress(60);
        setHint("Step 3: verifier is checking pill at your mouth");
      } else {
        nearMouthAtRef.current = null;
      }

      return;
    }

    if (intakeStepRef.current === "verifyPillInMouth") {
      if (stepStartedAtRef.current && Date.now() - stepStartedAtRef.current > STEP_TIMEOUT_MS) {
        resetVerification("Try again: the verifier needs to see the pill inside your mouth");
        return;
      }

      const recentlyAtMouth =
        lastNearMouthAtRef.current !== null &&
        Date.now() - lastNearMouthAtRef.current <= MOUTH_RELEASE_GRACE_MS;

      setPhase("holding");

      if (isHandOnMouth || recentlyAtMouth) {
        if (!nearMouthAtRef.current) nearMouthAtRef.current = Date.now();
        if (!mouthEvidenceAtRef.current) mouthEvidenceAtRef.current = Date.now();
        const mouthElapsed = Date.now() - nearMouthAtRef.current;
        setProgress(Math.min(60 + (mouthElapsed / MOUTH_HOLD_MS) * 20, 80));
        setHint("Step 3: verifier is checking pill inside mouth");

        if (mouthElapsed >= MOUTH_HOLD_MS) {
          intakeStepRef.current = "confirmTaken";
          stepStartedAtRef.current = Date.now();
          releaseAtRef.current = null;
          pathReachedMouthRef.current = true;
          setProgress(80);
          setHint("Step 4: show thumbs up to verify");
        }
      } else {
        nearMouthAtRef.current = null;
        setProgress(60);
        setHint("Step 3: keep the pill inside the mouth box");
      }

      return;
    }

    if (intakeStepRef.current === "confirmTaken") {
      setPhase("holding");

      if (!pathReachedMouthRef.current) {
        resetVerification("Try again: the pill must travel to the mouth before confirmation");
        return;
      }

      if (stepStartedAtRef.current && Date.now() - stepStartedAtRef.current > STEP_TIMEOUT_MS) {
        resetVerification("Try again: show thumbs up after the pill reaches your mouth");
        return;
      }

      if (isThumbsUp) {
        if (!releaseAtRef.current) releaseAtRef.current = Date.now();
        const confirmElapsed = Date.now() - releaseAtRef.current;
        setProgress(Math.min(80 + (confirmElapsed / CONFIRM_HOLD_MS) * 20, 100));
        setHint("Thumbs up detected");

        if (confirmElapsed >= CONFIRM_HOLD_MS) {
          confirmIntake();
        }
      } else {
        releaseAtRef.current = null;
        setProgress(80);
        setHint("Step 4: show thumbs up to verify");
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
              mouthEvidenceAtRef.current = null;
              releaseAtRef.current = null;
              pathStartRef.current = null;
              pathStartMouthDistanceRef.current = null;
              pathMaxTravelRef.current = 0;
              pathReachedMouthRef.current = false;
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
