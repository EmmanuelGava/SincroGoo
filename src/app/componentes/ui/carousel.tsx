"use client"

import * as React from "react"
import { 
  Box,
  MobileStepper,
  IconButton,
  useTheme,
  Fade
} from '@mui/material';
import {
  KeyboardArrowLeft as ArrowLeftIcon,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';

import { cn } from "@/app/lib/utils"

type CarouselProps = {
  children: React.ReactNode;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
};

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ children, className, autoPlay = false, interval = 3000, showDots = true, showArrows = true }, ref) => {
    const theme = useTheme();
    const [activeStep, setActiveStep] = React.useState(0);
    const childrenArray = React.Children.toArray(children);
    const maxSteps = childrenArray.length;

    const handleNext = () => {
      setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps);
    };

    const handleBack = () => {
      setActiveStep((prevActiveStep) => (prevActiveStep - 1 + maxSteps) % maxSteps);
    };

    React.useEffect(() => {
      let timer: NodeJS.Timeout;
      if (autoPlay) {
        timer = setInterval(handleNext, interval);
      }
      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    }, [autoPlay, interval]);

    return (
      <Box 
        ref={ref} 
        className={className}
        sx={{ 
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {childrenArray.map((child, index) => (
          <Fade 
            key={index} 
            in={activeStep === index}
            timeout={500}
            style={{
              display: activeStep === index ? 'block' : 'none'
            }}
          >
            <div>{child}</div>
          </Fade>
        ))}

        {showArrows && maxSteps > 1 && (
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            width: '100%', 
            transform: 'translateY(-50%)', 
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            px: 1
          }}>
            <IconButton
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'background.paper',
                }
              }}
            >
              <ArrowLeftIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={activeStep === maxSteps - 1}
              sx={{
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'background.paper',
                }
              }}
            >
              <ArrowRightIcon />
            </IconButton>
          </Box>
        )}

        {showDots && maxSteps > 1 && (
          <MobileStepper
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            sx={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              background: 'transparent',
              padding: '8px 0',
              '& .MuiMobileStepper-dot': {
                width: 8,
                height: 8,
                margin: '0 4px',
              },
              '& .MuiMobileStepper-dotActive': {
                backgroundColor: theme.palette.primary.main,
              },
            }}
            nextButton={<div />}
            backButton={<div />}
          />
        )}
      </Box>
    );
  }
);

Carousel.displayName = "Carousel";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Box
    ref={ref}
    sx={{
      width: '100%',
      flexShrink: 0,
    }}
    {...props}
  />
));

CarouselItem.displayName = "CarouselItem";

export { Carousel, CarouselItem };

