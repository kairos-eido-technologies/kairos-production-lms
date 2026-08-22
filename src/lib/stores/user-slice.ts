import { StateCreator } from "zustand";
import type { User } from "../types/store";

export interface UserSlice {
  users: User[];
  addUser: (u: Omit<User, "id">) => void;
  addUserRaw: (u: User) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (set) => ({
  users: [],

  addUser: (u) => {
    fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(u),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          set((s) => ({ users: [data.user, ...s.users.filter((x) => x.id !== data.user.id)] }));
        }
      })
      .catch((err) => console.error("Failed to add user:", err));
  },

  addUserRaw: (u) => set((s) => ({ users: [...s.users.filter((x) => x.id !== u.id), u] })),

  updateUser: (id, patch) => {
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
    fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => console.error("Failed to update user:", err));
  },

  deleteUser: (id) => {
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
    fetch(`/api/users/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete user:", err),
    );
  },
});
