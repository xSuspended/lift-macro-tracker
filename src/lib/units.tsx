import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { formatNumber } from './format';
import { supabase } from './supabase';

// Every weight in the database is kilograms. Pounds only exist on screen:
// converted for display, and converted back before saving.

export type WeightUnit = 'kg' | 'lb';

const KG_PER_LB = 0.45359237;

/** kg -> the number shown on screen (lb to 0.1, kg to 0.01). */
export function toDisplay(kg: number, unit: WeightUnit) {
  return unit === 'lb' ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 100) / 100;
}

/** A number typed or stepped on screen -> kg for the database. */
export function toKg(value: number, unit: WeightUnit) {
  return unit === 'lb' ? Math.round(value * KG_PER_LB * 100) / 100 : value;
}

/** "62.5 kg" or "137.5 lb". */
export function formatWeight(kg: number, unit: WeightUnit) {
  return `${formatNumber(toDisplay(kg, unit))} ${unit}`;
}

/** How far one tap of a lifting weight stepper moves. */
export const LIFT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

// ---------- the saved setting ----------

async function fetchWeightUnit(): Promise<WeightUnit> {
  const { data, error } = await supabase.from('profiles').select('weight_unit').single();
  if (error) throw error;
  return data.weight_unit === 'lb' ? 'lb' : 'kg';
}

async function saveWeightUnit(unit: WeightUnit) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('You are signed out. Sign in again.');
  const { error } = await supabase.from('profiles').update({ weight_unit: unit }).eq('id', data.session.user.id);
  if (error) throw error;
}

type UnitsValue = {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => Promise<void>;
};

const UnitsContext = createContext<UnitsValue>({ unit: 'kg', setUnit: async () => {} });

/** Loads your kg/lb choice once for everything behind the login. */
export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>('kg');

  useEffect(() => {
    // If this can't load, kg is a safe default; the setting just shows kg until next time.
    fetchWeightUnit().then(setUnitState, () => {});
  }, []);

  const setUnit = useCallback(async (next: WeightUnit) => {
    const previous = unit;
    setUnitState(next);
    try {
      await saveWeightUnit(next);
    } catch (e) {
      setUnitState(previous);
      throw e;
    }
  }, [unit]);

  return <UnitsContext.Provider value={{ unit, setUnit }}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  return useContext(UnitsContext);
}
