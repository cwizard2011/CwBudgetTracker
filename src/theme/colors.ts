const lightPalette = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  text: '#111827',
  heading: '#0B1220',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
  progressBackground: '#EEEEEE',

  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onSuccess: '#FFFFFF',
  onWarning: '#111827',
  onError: '#FFFFFF',

  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  secondaryLight: '#A78BFA',
  secondaryDark: '#7C3AED',
  successLight: '#34D399',
  successDark: '#059669',
  warningLight: '#FBBF24',
  warningDark: '#D97706',
  errorLight: '#F87171',
  errorDark: '#DC2626',
};

const darkPalette = {
  primary: '#60A5FA',
  secondary: '#A78BFA',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  text: '#F5F5F5',
  heading: '#FFFFFF',
  mutedText: '#9CA3AF',
  border: '#374151',
  background: '#121212',
  surface: '#1E1E1E',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
  progressBackground: '#333333',

  onPrimary: '#0B0B0B',
  onSecondary: '#0B0B0B',
  onSuccess: '#0B0B0B',
  onWarning: '#0B0B0B',
  onError: '#0B0B0B',

  primaryLight: '#93C5FD',
  primaryDark: '#3B82F6',
  secondaryLight: '#C4B5FD',
  secondaryDark: '#8B5CF6',
  successLight: '#6EE7B7',
  successDark: '#10B981',
  warningLight: '#FCD34D',
  warningDark: '#F59E0B',
  errorLight: '#FCA5A5',
  errorDark: '#EF4444',
};

const darkDimPalette = {
  ...darkPalette,
  background: '#181A1B',
  surface: '#202325',
  border: '#2A2E31',
  progressBackground: '#2A2E31',
};

const darkGrayPalette = {
  ...darkPalette,
  background: '#1F1F1F',
  surface: '#2A2A2A',
  border: '#3A3A3A',
  progressBackground: '#3A3A3A',
};

export const Colors: any = { ...lightPalette };

export function applyTheme(mode: boolean | 'darkDim' | 'darkGray') {
  let src: any;
  if (mode === true) src = darkPalette;
  else if (mode === 'darkDim') src = darkDimPalette;
  else if (mode === 'darkGray') src = darkGrayPalette;
  else src = lightPalette;
  Object.assign(Colors, src);
}


