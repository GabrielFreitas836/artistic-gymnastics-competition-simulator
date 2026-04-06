import { useEffect, useRef, useState } from "react";

export const useTimedIndicator = (durationMs = 7000) => {
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const trigger = (key: string): void => {
    const currentTimer = timersRef.current[key];
    if (currentTimer) clearTimeout(currentTimer);

    setActiveMap((current) => ({ ...current, [key]: true }));
    timersRef.current[key] = setTimeout(() => {
      setActiveMap((current) => ({ ...current, [key]: false }));
    }, durationMs);
  };

  const isActive = (key: string): boolean => activeMap[key] === true;

  const reset = (): void => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    setActiveMap({});
  };

  return {
    activeMap,
    trigger,
    isActive,
    reset,
  };
};
