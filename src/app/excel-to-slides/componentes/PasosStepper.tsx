import { Stepper, Step, StepLabel } from '@mui/material';

const pasos = [
  'Seleccionar archivo Excel',
  'Configurar plantilla',
  'Previsualizar',
  'Generar presentación'
];

interface PasosStepperProps {
  pasoActivo: number;
}

export default function PasosStepper({ pasoActivo }: PasosStepperProps) {
  return (
    <Stepper activeStep={pasoActivo} sx={{ mb: 4 }}>
      {pasos.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
} 