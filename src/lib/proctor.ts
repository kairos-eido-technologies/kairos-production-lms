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

  // Keep camera stream bound to video element as soon as it mounts in the DOM
  useEffect(() => {
    if (cameraReady && streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  // request fullscreen + camera + listeners
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const root = document.documentElement;
    const enterFs = async () => {
      try {
        if (!document.fullscreenElement && root.requestFullscreen) {
          await root.requestFullscreen();
          setFullscreenActive(true);
          setFullscreenError(null);
          log("fullscreen_enter");
        }
      } catch (e: any) {
        setFullscreenActive(false);
        const message = e?.message ?? "Fullscreen denied";
        setFullscreenError(message);
        log("fullscreen_exit", "request_failed:" + message);
      }
    };
    enterFs();
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

            // Simple skin pixel heuristic to check for face presence
            let skinPixels = 0;
            for (let i = 0; i < len; i += 4) {
              const r = frame.data[i];
              const g = frame.data[i + 1];
              const b = frame.data[i + 2];
              if (
                r > 95 &&
                g > 40 &&
                b > 20 &&
                r > g &&
                r > b &&
                Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                Math.abs(r - g) > 15
              ) {
                skinPixels++;
              }
            }

            const skinRatio = skinPixels / (canvas.width * canvas.height);
            const now = Date.now();

            if (skinRatio < 0.02 && now - lastFaceCheckAtRef.current > 10000) {
              lastFaceCheckAtRef.current = now;
              log("camera_motion", "Face not detected in frame");
            } else if (skinRatio > 0.55 && now - lastFaceCheckAtRef.current > 10000) {
              lastFaceCheckAtRef.current = now;
              log("multiple_faces", "Possible multiple faces detected");
            }

            if (lastFrame) {
              let diff = 0;
              for (let i = 0; i < len; i += 4) {
                diff += Math.abs(frame.data[i] - lastFrame.data[i]);
                diff += Math.abs(frame.data[i + 1] - lastFrame.data[i + 1]);
                diff += Math.abs(frame.data[i + 2] - lastFrame.data[i + 2]);
              }
              const avg = diff / (canvas.width * canvas.height * 3);
              if (avg > 10 && now - lastMotionAtRef.current > 5000) {
                lastMotionAtRef.current = now;
                log("camera_motion", `movement:${Math.round(avg)}`);
              }
            }
            motionFrameRef.current = frame;
          };

          motionTimerRef.current = window.setInterval(sampleMotion, 1200);
        })
        .catch((e) => {
          setCameraError(e?.message ?? "Camera denied");
          log("camera_denied", e?.message);
        });
    }

    const onVis = () => {
      if (document.hidden) log("visibility_hidden");
      else log("visibility_visible");
    };
    const onBlur = () => log("tab_blur");
    const onFocus = () => log("tab_focus");
    const onFs = () => {
      if (document.fullscreenElement) {
        setFullscreenActive(true);
      } else {
        setFullscreenActive(false);
        log("fullscreen_exit");
        setTimeout(() => {
          root.requestFullscreen?.().catch((err) => {
            setFullscreenError(err?.message ?? "Fullscreen denied");
          });
        }, 100);
      }
    };
    const onCopy = () => log("copy");
    const onPaste = () => log("paste");
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      log("context_menu");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        if (["c", "v", "x", "p", "u", "s", "Tab"].includes(e.key)) log("key_meta", e.key);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("keydown", onKey);
      if (motionTimerRef.current) {
        window.clearInterval(motionTimerRef.current);
        motionTimerRef.current = null;
      }
      motionFrameRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, camera, log]);

  return { events, log, videoRef, cameraReady, cameraError, fullscreenActive, fullscreenError };
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
