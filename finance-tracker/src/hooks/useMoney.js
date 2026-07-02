// useMoney — a formatter bound to the user's chosen display currency.
//
// Components call `const money = useMoney()` then `money(amount)`. This keeps
// currency selection in one place (settings) rather than threading a prop
// through every component.

import { useCallback } from 'react';
import { formatMoney } from '../lib/domain.js';
import { useSettings } from '../store/SettingsContext.jsx';

export function useMoney() {
  const { currency } = useSettings();
  return useCallback((amount) => formatMoney(amount, currency), [currency]);
}
