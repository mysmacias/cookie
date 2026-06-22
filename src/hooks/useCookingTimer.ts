import { useState, useEffect, useRef } from 'react';

const TIMER_RING_RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

export function useCookingTimer(stepIndex: number, onComplete?: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setRemaining(null);
    setRunning(false);
    setTotal(0);
    firedRef.current = false;
  }, [stepIndex]);

  useEffect(() => {
    if (!running || remaining === null || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev === null || prev <= 1) {
          setRunning(false);
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, remaining === null]);

  useEffect(() => {
    if (remaining === 0 && total > 0 && !firedRef.current) {
      firedRef.current = true;
      onCompleteRef.current?.();
    }
  }, [remaining, total]);

  const isComplete = remaining === 0;
  const isStarted = remaining !== null;

  const start = (seconds: number) => {
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const resume = () => {
    if (remaining !== null && remaining > 0) setRunning(true);
  };

  const toggle = (timerSeconds: number) => {
    if (!isStarted) start(timerSeconds);
    else if (running) pause();
    else if (remaining! > 0) resume();
  };

  const buttonLabel = !isStarted
    ? 'Start Timer'
    : running ? 'Pause'
    : isComplete ? 'Timer Complete!'
    : 'Resume';

  const dashOffset = !isStarted
    ? 0
    : isComplete
      ? CIRCUMFERENCE
      : CIRCUMFERENCE * (1 - remaining! / total);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const display = isStarted ? formatTime(remaining!) : null;

  return {
    remaining, running, total,
    isComplete, isStarted,
    start, pause, resume, toggle,
    buttonLabel, dashOffset,
    formatTime, display,
    ringRadius: TIMER_RING_RADIUS,
    circumference: CIRCUMFERENCE,
  };
}
