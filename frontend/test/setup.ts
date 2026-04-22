import '@testing-library/jest-dom';

// Silenciar errores de consola esperados en tests (p.ej. advertencias de React Router)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalError.call(console, ...(args as Parameters<typeof console.error>));
  };
});
afterAll(() => {
  console.error = originalError;
});
