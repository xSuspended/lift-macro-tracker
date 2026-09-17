// Dark-mode colour palette and spacing scale used across the whole app.
// Keeping these in one place means we restyle everything by editing this file.

export const colors = {
  bg: '#0B0F14',
  card: '#161B22',
  cardPressed: '#1C232C',
  border: '#2A323D',
  text: '#E6EDF3',
  textDim: '#8B98A5',
  accent: '#3B82F6',
  accentPressed: '#2563EB',
  onAccent: '#FFFFFF',
  danger: '#F87171',
  warning: '#EAB308',
  /** Vivid red for going over a target, with a lighter tint for its shine. */
  overTarget: '#FF2B2B',
  overTargetShine: '#FFA3A3',
  onWarning: '#0B0F14',
  success: '#4ADE80',
};

// Macro colours. Green, yellow and red are hard to tell apart with red-green
// colour blindness; the food chart labels each line's end so colour isn't the
// only way to tell them apart.
export const macroColors = {
  kcal: '#E6EDF3',
  protein: '#16A34A',
  carbs: '#C08A00',
  fat: '#E8544A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

// Minimum height for anything tappable, so sets can be logged mid-workout.
export const TAP_TARGET = 56;
