import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AlarmModal from "@/components/AlarmModal";
import { useApp } from "@/contexts/AppContext";
import { getMedicineReminderKey, useMedicineReminder } from "@/hooks/useMedicineReminder";

export default function MedicineAlarmManager() {
  const { medicationPlans } = useApp();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const activeAudioKeyRef = useRef(null);
  const fallbackAudioRef = useRef({ context: null, intervalId: null });
  const {
    alarmLevel,
    activeReminder,
    currentTime,
    isAlarmRinging,
    isModalOpen,
    beginVerification,
  } = useMedicineReminder(medicationPlans);

  const stopAlarmAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    if (fallbackAudioRef.current.intervalId) {
      window.clearInterval(fallbackAudioRef.current.intervalId);
    }
    fallbackAudioRef.current.context?.close?.();
    fallbackAudioRef.current = { context: null, intervalId: null };
  };

  const startFallbackTone = () => {
    if (fallbackAudioRef.current.intervalId) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const playTone = () => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.42);
    };

    playTone();
    fallbackAudioRef.current = {
      context,
      intervalId: window.setInterval(playTone, 650),
    };
  };

  useEffect(() => {
    if (!activeReminder || !isAlarmRinging) {
      stopAlarmAudio();
      activeAudioKeyRef.current = null;
      return;
    }

    const reminderKey = `${getMedicineReminderKey(activeReminder)}-${alarmLevel}`;
    if (activeAudioKeyRef.current === reminderKey) {
      return;
    }

    stopAlarmAudio();
    const audio = new Audio("/sounds/alarm.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;
    activeAudioKeyRef.current = reminderKey;

    void audio.play().catch((error) => {
      console.warn("Medicine alarm playback was blocked by the browser", error);
      startFallbackTone();
    });
  }, [activeReminder, alarmLevel, isAlarmRinging]);

  useEffect(() => {
    return () => {
      stopAlarmAudio();
    };
  }, []);

  const handleVerify = () => {
    if (!activeReminder) return;

    beginVerification();
    navigate("/prescriptions", {
      state: {
        alarmVerificationDose: activeReminder,
      },
    });
  };

  return (
    <AlarmModal
      reminder={isModalOpen ? activeReminder : null}
      alarmLevel={alarmLevel}
      currentTime={currentTime}
      onVerify={handleVerify}
    />
  );
}
