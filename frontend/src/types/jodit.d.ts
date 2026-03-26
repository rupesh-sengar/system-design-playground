declare global {
  interface Window {
    Jodit?: {
      make: (
        element: HTMLElement,
        config?: Record<string, unknown>,
      ) => {
        destruct: () => void;
        value: string;
      };
    };
  }
}

export {};
