import { create } from 'zustand';

const STORAGE_KEY = 'erd-user-nickname';

interface UserState {
  nickname: string | null;
  setNickname: (nickname: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  nickname: localStorage.getItem(STORAGE_KEY),

  setNickname: (nickname: string) => {
    localStorage.setItem(STORAGE_KEY, nickname);
    set({ nickname });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ nickname: null });
  },
}));
