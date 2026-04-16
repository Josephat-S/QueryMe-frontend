import { createContext } from 'react';

import type { ThemeContextValue } from './ThemeContext';

export const ThemeCtx = createContext<ThemeContextValue | null>(null);