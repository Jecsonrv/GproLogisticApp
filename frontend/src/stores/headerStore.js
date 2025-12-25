import { create } from 'zustand';

const useHeaderStore = create((set) => ({
    actions: null, // Componente React o null
    setActions: (actions) => set({ actions }),
    clearActions: () => set({ actions: null }),
}));

export default useHeaderStore;
