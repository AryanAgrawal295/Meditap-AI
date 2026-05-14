import { useEffect, useMemo, useRef, useState } from "react";

const LEVEL_1_STOP_MS = 60 * 1000;
const LEVEL_2_START_MS = 3 * 60 * 1000;
const LEVEL_2_STOP_MS = 4 * 60 * 1000;
const LEVEL_3_START_MS = 5 * 60 * 1000;

function getDoseKey(dose) {
  return `${dose.planId}-${dose.medicineId}-${dose._id}`;
}

function isSameMinute(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getHours() === secondDate.getHours() &&
    firstDate.getMinutes() === secondDate.getMinutes()
  );
}

function flattenPendingDoses(plans) {
  return plans
    .filter((plan) => plan.status !== "paused")
    .flatMap((plan) =>
      plan.medicines.flatMap((medicine) =>
        medicine.doses
          .filter((dose) => dose.status === "pending")
          .map((dose) => ({
            ...dose,
            planId: plan.id,
            medicineId: medicine._id,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            frequency: medicine.frequency,
            timingLabel: dose.timingLabel,
            quantityPerDose: medicine.quantityPerDose,
            prescriptionIndex: medicine.prescriptionIndex,
            prescriptionTag: medicine.prescriptionTag,
          })),
      ),
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

function findDose(plans, reminder) {
  if (!reminder) return null;

  const plan = plans.find((item) => item.id === reminder.planId);
  const medicine = plan?.medicines.find((item) => item._id === reminder.medicineId);

  return medicine?.doses.find((dose) => dose._id === reminder._id) || null;
}

export function getMedicineReminderKey(dose) {
  return getDoseKey(dose);
}

export function useMedicineReminder(medicationPlans) {
  const completedKeysRef = useRef(new Set());
  const timerRefs = useRef([]);
  const isVerificationOpenRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [activeReminder, setActiveReminder] = useState(null);
  const [alarmLevel, setAlarmLevel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  const pendingDoses = useMemo(() => flattenPendingDoses(medicationPlans), [medicationPlans]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const clearEscalationTimers = () => {
    timerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    timerRefs.current = [];
  };

  const stopActiveReminder = (reminder) => {
    if (reminder) {
      completedKeysRef.current.add(getDoseKey(reminder));
    }

    clearEscalationTimers();
    setActiveReminder(null);
    setAlarmLevel(null);
    setIsModalOpen(false);
    setIsVerificationOpen(false);
    isVerificationOpenRef.current = false;
  };

  const startAlarmLevel = (level) => {
    setAlarmLevel(level);
    setIsModalOpen(!isVerificationOpenRef.current);
  };

  const stopAlarmLevel = (level) => {
    setAlarmLevel((currentLevel) => (currentLevel === level ? null : currentLevel));
    setIsModalOpen(false);
  };

  const scheduleEscalationTimers = (dose) => {
    clearEscalationTimers();

    const scheduledAt = new Date(dose.scheduledAt).getTime();
    const elapsedMs = Math.max(0, Date.now() - scheduledAt);
    const scheduleTimeout = (targetMs, callback) => {
      const timeoutMs = Math.max(0, targetMs - elapsedMs);
      const timerId = window.setTimeout(callback, timeoutMs);
      timerRefs.current.push(timerId);
    };

    setActiveReminder(dose);
    setIsVerificationOpen(false);
    isVerificationOpenRef.current = false;

    if (elapsedMs < LEVEL_1_STOP_MS) {
      startAlarmLevel(1);
      scheduleTimeout(LEVEL_1_STOP_MS, () => stopAlarmLevel(1));
    } else if (elapsedMs < LEVEL_2_START_MS) {
      stopAlarmLevel(1);
    }

    if (elapsedMs < LEVEL_2_START_MS) {
      scheduleTimeout(LEVEL_2_START_MS, () => startAlarmLevel(2));
      scheduleTimeout(LEVEL_2_STOP_MS, () => stopAlarmLevel(2));
    } else if (elapsedMs < LEVEL_2_STOP_MS) {
      startAlarmLevel(2);
      scheduleTimeout(LEVEL_2_STOP_MS, () => stopAlarmLevel(2));
    }

    if (elapsedMs >= LEVEL_3_START_MS) {
      startAlarmLevel(3);
    } else {
      scheduleTimeout(LEVEL_3_START_MS, () => startAlarmLevel(3));
    }
  };

  useEffect(() => {
    if (activeReminder) {
      const dose = findDose(medicationPlans, activeReminder);

      if (!dose || dose.status === "taken") {
        stopActiveReminder(activeReminder);
      }

      return;
    }

    const dueDose = pendingDoses.find((dose) => {
      const reminderKey = getDoseKey(dose);
      return (
        !completedKeysRef.current.has(reminderKey) &&
        isSameMinute(new Date(dose.scheduledAt), currentTime)
      );
    });

    if (dueDose) {
      scheduleEscalationTimers(dueDose);
    }
  }, [activeReminder, currentTime, medicationPlans, pendingDoses]);

  useEffect(() => {
    return clearEscalationTimers;
  }, []);

  return {
    alarmLevel,
    activeReminder,
    currentTime,
    isAlarmRinging: Boolean(alarmLevel),
    isModalOpen,
    beginVerification: () => {
      setIsModalOpen(false);
      setIsVerificationOpen(true);
      isVerificationOpenRef.current = true;
    },
  };
}
