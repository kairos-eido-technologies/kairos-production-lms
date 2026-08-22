// Proctoring hook: fullscreen lock + (optional) camera + suspicious event logging.
import { useEffect, useRef, useState, useCallback } from "react";

export interface ProctorEvent {
  at: string;
  type:
    | "started"
    | "fullscreen_enter"
    | "fullscreen_exit"
    | "tab_blur"
    | "tab_focus"
    | "visibility_hidden"
    | "visibility_visible"
    | "copy"
    | "paste"
    | "context_menu"
    | "key_meta"
    | "camera_enabled"
    | "camera_denied"
    | "camera_ended"
    | "camera_motion"
    | "multiple_faces"
    | "submitted";
  detail?: string;
}

export interface UseProctorOpts {
  enabled: boolean;
  camera: boolean;
}

export function useProctor({ enabled, camera }: UseProctorOpts) {
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionFrameRef = useRef<ImageData | null>(null);
  const motionTimerRef = useRef<number | null>(null);
  const lastMotionAtRef = useRef<number>(0);
  const lastFaceCheckAtRef = useRef<number>(0);

  const log = useCallback((type: ProctorEvent["type"], detail?: string) => {
    setEvents((prev) => [...prev, { at: new Date().toISOString(), type, detail }]);
  }, []);

  const requestFullscreen = useCallback(async () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    try {
      const root = document.documentElement;
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if ((root as any).webkitRequestFullscreen) {
        await (root as any).webkitRequestFullscreen();
      }
      setFullscreenActive(true);
      setFullscreenError(null);
      log("fullscreen_enter");
    } catch (e: any) {
      setFullscreenActive(false);
      setFullscreenError("Please click the Allow Fullscreen button below to grant permission.");
      log("fullscreen_exit", "request_failed:" + (e?.message || "denied"));
    }
  }, [log]);

  const requestCamera = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
      log("camera_enabled");
    } catch (e: any) {
      setCameraReady(false);
      setCameraError("Camera access required. Click Allow Camera below.");
      log("camera_denied", e?.message);
    }
  }, [log]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
        t.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // Keep camera stream bound to video element as soon as it mounts in the DOM
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      cameraReady &&
      streamRef.current &&
      videoRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  // request fullscreen + camera + listeners
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined" || !enabled) {
      stopCamera();
      return;
    }
    let cancelled = false;

    requestFullscreen();
    log("started");

    if (camera && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraReady(true);
          log("camera_enabled");
          stream.getVideoTracks()[0]?.addEventListener("ended", () => log("camera_ended"));

          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext("2d");

          const sampleMotion = () => {
            if (!ctx || !videoRef.current || videoRef.current.readyState < 2) return;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const lastFrame = motionFrameRef.current;
            const len = frame.data.length;

            let skinPixels = 0;
            let brightPixels = 0; // Phone/screen glare detection

            for (let i = 0; i < len; i += 4) {
              const r = frame.data[i];
              const g = frame.data[i + 1];
              const b = frame.data[i + 2];

              if (r > 90 && g > 35 && b > 15 && r > g && r > b && Math.abs(r - g) > 12) {
                skinPixels++;
              }
              if (r > 225 && g > 225 && b > 225) {
                brightPixels++;
              }
            }

            const now = Date.now();

            if (brightPixels > 2500 && now - lastMotionAtRef.current > 8000) {
              lastMotionAtRef.current = now;
              log("camera_motion", "High brightness glare detected (Potential phone/device)");
            }

            if (skinPixels > 20000 && now - lastFaceCheckAtRef.current > 12000) {
              lastFaceCheckAtRef.current = now;
              log("multiple_faces", "Multiple faces or extra person detected");
            } else if (skinPixels < 1200 && now - lastFaceCheckAtRef.current > 12000) {
              lastFaceCheckAtRef.current = now;
              log("camera_motion", "Face absent or student turned away from camera");
            }

            if (lastFrame) {
              let diff = 0;
              for (let i = 0; i < len; i += 8) {
                diff += Math.abs(frame.data[i] - lastFrame.data[i]);
              }
              const avg = diff / (len / 8);
              if (avg > 14 && now - lastMotionAtRef.current > 6000) {
                lastMotionAtRef.current = now;
                log("camera_motion", `Head movement / position shift (avg_${Math.round(avg)})`);
              }
            }
            motionFrameRef.current = frame;
          };

          motionTimerRef.current = window.setInterval(sampleMotion, 1000);
        })
        .catch((err) => {
          if (!cancelled) {
            setCameraReady(false);
            setCameraError(err.message || "Camera access denied");
            log("camera_denied", err.message);
          }
        });
    }

    const onFs = () => {
      const isFs = Boolean(document.fullscreenElement);
      setFullscreenActive(isFs);
      if (!isFs) {
        log("fullscreen_exit");
        if (enabled) {
          setTimeout(() => {
            requestFullscreen().catch(() => {});
          }, 300);
        }
      } else {
        log("fullscreen_enter");
      }
    };

    const onBlur = () => log("tab_blur");
    const onFocus = () => log("tab_focus");
    const onVis = () => {
      if (document.hidden) log("visibility_hidden");
      else log("visibility_visible");
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      log("copy");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      log("paste");
    };
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      log("context_menu");
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Meta" ||
        e.key === "Alt" ||
        (e.ctrlKey &&
          (e.key === "c" ||
            e.key === "v" ||
            e.key === "tab" ||
            e.key === "w" ||
            e.key === "n" ||
            e.key === "p" ||
            e.key === "s"))
      ) {
        log("key_meta", e.key);
      }
    };

    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("keydown", onKey);
      if (motionTimerRef.current) {
        window.clearInterval(motionTimerRef.current);
        motionTimerRef.current = null;
      }
      motionFrameRef.current = null;
      stopCamera();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, camera, log, requestFullscreen, stopCamera]);

  return {
    events,
    log,
    videoRef,
    cameraReady,
    cameraError,
    fullscreenActive,
    fullscreenError,
    requestFullscreen,
    requestCamera,
    stopCamera,
  };
}

export function summarizeEvents(events: ProctorEvent[]) {
  const suspicious = events.filter((e) =>
    [
      "fullscreen_exit",
      "tab_blur",
      "visibility_hidden",
      "copy",
      "paste",
      "context_menu",
      "key_meta",
      "camera_denied",
      "camera_ended",
      "camera_motion",
      "multiple_faces",
    ].includes(e.type),
  );
  return { total: events.length, suspicious: suspicious.length, events };
}
