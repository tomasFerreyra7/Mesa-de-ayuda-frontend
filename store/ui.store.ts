import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  // Modals
  openModal: string | null;
  openModalFn: (name: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeView: "dashboard",
      openModal: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setActiveView: (view) => set({ activeView: view }),
      openModalFn: (name) => set({ openModal: name }),
      closeModal: () => set({ openModal: null }),
    }),
    {
      name: "sistemapj-ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
