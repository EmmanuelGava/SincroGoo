"use client"

import * as React from "react"
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

export type CalendarProps = {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | null) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
};

function Calendar({
  selected,
  onSelect,
  disabled,
  minDate,
  maxDate,
}: CalendarProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <DateCalendar
        value={selected}
        onChange={onSelect}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        sx={{
          width: '100%',
          '& .MuiPickersDay-root': {
            fontSize: '0.875rem',
          },
        }}
      />
    </LocalizationProvider>
  );
}

Calendar.displayName = "Calendar"

export { Calendar }
