import { StateCreator } from "zustand";
import type { VideoCheckpoint, CheckpointProgress } from "../types/store";

export interface CheckpointSlice {
  videoCheckpoints: VideoCheckpoint[];
  checkpointProgress: CheckpointProgress[];
  addCheckpoint: (checkpoint: Omit<VideoCheckpoint, "id"> & { id?: string }) => Promise<void>;
  deleteCheckpoint: (id: string) => Promise<void>;
  submitCheckpointAnswer: (
    studentId: string,
    checkpointId: string,
    isCorrect: boolean,
  ) => Promise<void>;
}

export const createCheckpointSlice: StateCreator<CheckpointSlice, [], [], CheckpointSlice> = (
  set,
) => ({
  videoCheckpoints: [],
  checkpointProgress: [],

  addCheckpoint: async (checkpoint) => {
    try {
      const res = await fetch("/api/video-checkpoints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(checkpoint),
      });
      const data = await res.json();
      if (data.videoCheckpoint) {
        set((s) => ({
          videoCheckpoints: [
            ...s.videoCheckpoints.filter((v) => v.id !== data.videoCheckpoint.id),
            data.videoCheckpoint,
          ],
        }));
      }
    } catch (err) {
      console.error("Failed to add video checkpoint:", err);
    }
  },

  deleteCheckpoint: async (id) => {
    set((s) => ({ videoCheckpoints: s.videoCheckpoints.filter((v) => v.id !== id) }));
    fetch(`/api/video-checkpoints/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete video checkpoint:", err),
    );
  },

  submitCheckpointAnswer: async (studentId, checkpointId, isCorrect) => {
    try {
      const res = await fetch("/api/checkpoint-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, checkpointId, isCorrect }),
      });
      const data = await res.json();
      if (data.checkpointProgress) {
        set((s) => ({
          checkpointProgress: [
            ...s.checkpointProgress.filter(
              (p) => !(p.studentId === studentId && p.checkpointId === checkpointId),
            ),
            data.checkpointProgress,
          ],
        }));
      }
    } catch (err) {
      console.error("Failed to submit checkpoint progress:", err);
    }
  },
});
