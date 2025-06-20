import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import gsap from 'gsap';
import { useInView } from 'react-intersection-observer';

interface IconData {
  src: string;
  angleOffset: number;
  message: string;
}

const titlePhrases = [
  "Gestión inteligente de documentos",
  "Sincronización automática en tiempo real",
  "Organización eficiente de archivos",
  "Colaboración en equipo simplificada",
  "Integración con múltiples plataformas",
  "Respaldo seguro en la nube"
];

const icons: IconData[] = [
  { src: '/icons/sheets.svg', angleOffset: 0, message: "Hojas de cálculo" },
  { src: '/icons/pdf.svg', angleOffset: 40, message: "Documentos PDF" },
  { src: '/icons/docs.svg', angleOffset: 80, message: "Documentos de texto" },
  { src: '/icons/word.svg', angleOffset: 120, message: "Archivos Word" },
  { src: '/icons/drive.svg', angleOffset: 160, message: "Google Drive" },
  { src: '/icons/excel.svg', angleOffset: 200, message: "Archivos Excel" },
  { src: '/icons/slides.svg', angleOffset: 240, message: "Presentaciones" },
  { src: '/icons/notion.svg', angleOffset: 280, message: "Notas Notion" },
  { src: '/icons/maps.svg', angleOffset: 320, message: "Ubicaciones" }
].map((icon, index) => ({
  ...icon,
  angleOffset: (index * 360) / 9
}));

const GoogleSyncAnimation: React.FC = () => {
  const [radius, setRadius] = useState(160);
  const [isMobile, setIsMobile] = useState(false);
  const iconRefs = useRef<HTMLDivElement[]>([]);
  const messageRefs = useRef<HTMLDivElement[]>([]);
  const centerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const currentPhraseIndex = useRef(0);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });

  // Efecto para manejar el responsive
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        setRadius(mobile ? 120 : 160);
      };

      handleResize(); // Llamada inicial
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (inView && iconRefs.current.length > 0 && centerRef.current) {
      if (animationRef.current) {
        animationRef.current.kill();
      }

      const calculateOriginalPosition = (index: number) => {
        const angle = ((index * 360) / 9) * (Math.PI / 180);
        return {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle)
        };
      };

      // Animación del ícono central
      gsap.to(centerRef.current, {
        scale: 1.1,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut"
      });

      const masterTimeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 3
      });

      const tiempoEntreEntradas = 0.8;
      const tiempoEnPosicionInicial = 2;
      const tiempoAnimacionFinal = 2; // Tiempo para la animación final
      
      // Timeline para la animación final de sincronización
      const syncCompletedTimeline = gsap.timeline()
        // Efecto inicial de expansión
        .to(centerRef.current, {
          scale: 1.5,
          boxShadow: '0 0 60px rgba(52, 168, 83, 0.8), inset 0 0 50px rgba(52, 168, 83, 0.7)',
          duration: 0.5,
          ease: "power2.inOut"
        })
        // Rotación con estela
        .to('.sync-trail', {
          strokeDashoffset: 0,
          duration: 1,
          ease: "power1.inOut",
          onStart: () => {
            // Mostrar la estela
            document.querySelector('.sync-trail')?.setAttribute('opacity', '1');
          }
        }, "<")
        // Aparecer el check
        .to('.success-check', {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out"
        })
        // Volver al estado normal con el check visible
        .to(centerRef.current, {
          scale: 1,
          boxShadow: '0 0 30px rgba(52, 168, 83, 0.3), inset 0 0 30px rgba(52, 168, 83, 0.2)',
          duration: 0.5,
          ease: "elastic.out(1, 0.3)"
        })
        // Desvanecer el check y la estela
        .to(['.success-check', '.sync-trail'], {
          opacity: 0,
          duration: 0.3,
          ease: "power2.in"
        }, "+=0.5");

      // SVG para la estela
      const svgTrail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgTrail.setAttribute('viewBox', '0 0 200 200');
      svgTrail.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 200px;
        height: 200px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 3;
      `;

      // Estela circular
      const trail = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      trail.setAttribute('class', 'sync-trail');
      trail.setAttribute('cx', '100');
      trail.setAttribute('cy', '100');
      trail.setAttribute('r', isMobile ? '50' : '70');
      trail.setAttribute('fill', 'none');
      trail.setAttribute('stroke', 'rgba(52, 168, 83, 0.6)');
      trail.setAttribute('stroke-width', isMobile ? '4' : '6');
      trail.setAttribute('opacity', '0');
      const trailCircumference = 2 * Math.PI * (isMobile ? 50 : 70);
      trail.setAttribute('stroke-dasharray', trailCircumference.toString());
      trail.setAttribute('stroke-dashoffset', trailCircumference.toString());
      trail.style.filter = 'drop-shadow(0 0 8px rgba(52, 168, 83, 0.4))';

      svgTrail.appendChild(trail);
      centerRef.current?.parentElement?.appendChild(svgTrail);

      // SVG para el check y texto
      const svgSuccess = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgSuccess.setAttribute('viewBox', '0 0 200 200');
      svgSuccess.style.cssText = `
        position: absolute;
        top: 50%;
        left: ${isMobile ? '140%' : '95%'};
        width: ${isMobile ? '180px' : '240px'};
        height: 200px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 1;
      `;

      // Check background
      const checkBackground = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      checkBackground.setAttribute('class', 'success-check-bg');
      checkBackground.setAttribute('cx', '70');
      checkBackground.setAttribute('cy', '100');
      checkBackground.setAttribute('r', isMobile ? '28' : '32');
      checkBackground.setAttribute('fill', 'rgba(52, 168, 83, 0.15)');
      checkBackground.setAttribute('opacity', '0');
      checkBackground.style.filter = 'blur(8px)';

      // Check path
      const check = document.createElementNS("http://www.w3.org/2000/svg", "path");
      check.setAttribute('class', 'success-check');
      check.setAttribute('d', isMobile ? 'M55,100 L65,110 L85,90' : 'M50,100 L65,115 L90,85');
      check.setAttribute('fill', 'none');
      check.setAttribute('stroke', '#34A853');
      check.setAttribute('stroke-width', isMobile ? '5' : '6');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round');
      check.setAttribute('opacity', '0');
      const checkLength = check.getTotalLength();
      check.setAttribute('stroke-dasharray', checkLength.toString());
      check.setAttribute('stroke-dashoffset', checkLength.toString());
      check.style.filter = 'drop-shadow(0 0 3px rgba(52, 168, 83, 0.4))';

      // Text container
      const textBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      textBackground.setAttribute('class', 'success-text-bg');
      textBackground.setAttribute('x', '110');
      textBackground.setAttribute('y', '80');
      textBackground.setAttribute('width', isMobile ? '120' : '160');
      textBackground.setAttribute('height', '45');
      textBackground.setAttribute('rx', '15');
      textBackground.setAttribute('fill', 'rgba(52, 168, 83, 0.1)');
      textBackground.setAttribute('opacity', '0');

      // Texts
      const text1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text1.setAttribute('class', 'success-text');
      text1.setAttribute('x', '120');
      text1.setAttribute('y', '100');
      text1.setAttribute('fill', '#34A853');
      text1.setAttribute('font-family', '"Google Sans", "Segoe UI", Roboto, sans-serif');
      text1.setAttribute('font-size', isMobile ? '12' : '14');
      text1.setAttribute('font-weight', '500');
      text1.setAttribute('opacity', '0');
      text1.textContent = 'Sincronización';
      text1.style.filter = 'drop-shadow(0 1px 2px rgba(52, 168, 83, 0.2))';

      const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text2.setAttribute('class', 'success-text');
      text2.setAttribute('x', '120');
      text2.setAttribute('y', '118');
      text2.setAttribute('fill', '#34A853');
      text2.setAttribute('font-family', '"Google Sans", "Segoe UI", Roboto, sans-serif');
      text2.setAttribute('font-size', isMobile ? '12' : '14');
      text2.setAttribute('font-weight', '500');
      text2.setAttribute('opacity', '0');
      text2.textContent = 'completada';
      text2.style.filter = 'drop-shadow(0 1px 2px rgba(52, 168, 83, 0.2))';

      svgSuccess.appendChild(checkBackground);
      svgSuccess.appendChild(textBackground);
      svgSuccess.appendChild(check);
      svgSuccess.appendChild(text1);
      svgSuccess.appendChild(text2);
      centerRef.current?.parentElement?.appendChild(svgSuccess);

      let iconosEnCentro = 0;

      iconRefs.current.forEach((icon, index) => {
        const originalPos = calculateOriginalPosition(index);
        
        const singleIconTimeline = gsap.timeline()
          // Estado inicial con sombra azul
          .set(icon, { 
            scale: 1, 
            opacity: 1,
            transform: `translate(-50%, -50%) translate(${originalPos.x}px, ${originalPos.y}px)`,
            zIndex: 1,
            boxShadow: '0 6px 24px rgba(66, 133, 244, 0.2)' // Sombra azul inicial
          })
          .to({}, { duration: tiempoEnPosicionInicial })
          // Animación inicial de flotación
          .to(icon, {
            y: "-=20",
            rotation: 180,
            duration: 1.5,
            ease: "power1.inOut"
          })
          // Moverse al centro
          .to(icon, {
            xPercent: () => {
              const rect = icon.getBoundingClientRect();
              if (!centerRef.current) {
                console.warn("centerRef.current es nulo en xPercent. Devolviendo 0.");
                return 0;
              }
              const centerRect = centerRef.current.getBoundingClientRect();
              return ((centerRect.left + centerRect.width/2 - rect.left) / rect.width) * 100;
            },
            yPercent: () => {
              const rect = icon.getBoundingClientRect();
              if (!centerRef.current) {
                console.warn("centerRef.current es nulo en yPercent. Devolviendo 0.");
                return 0;
              }
              const centerRect = centerRef.current.getBoundingClientRect();
              return ((centerRect.top + centerRect.height/2 - rect.top) / rect.height) * 100;
            },
            scale: 0.6,
            rotation: "+=360",
            duration: 2,
            ease: "power2.inOut",
            onStart: () => {
              // Efecto de estela azul
              gsap.to(icon, {
                boxShadow: '0 0 30px rgba(66, 133, 244, 0.6)',
                duration: 0.5
              });

              // Actualizar el mensaje inferior
              const messageEl = document.querySelector('#bottom-message');
              if (messageEl) {
                messageEl.textContent = icons[index].message;
                gsap.to(messageEl, {
                  opacity: 1,
                  duration: 0.5,
                  ease: "power2.out"
                });
              }
            },
            onComplete: () => {
              // Efecto de absorción en el ícono central
              gsap.timeline()
                .to(centerRef.current, {
                  scale: 1.3,
                  boxShadow: '0 0 50px rgba(52, 168, 83, 0.8), inset 0 0 40px rgba(52, 168, 83, 0.6)',
                  duration: 0.6
                })
                .to(centerRef.current, {
                  scale: 1,
                  duration: 0.8,
                  ease: "elastic.out(1, 0.3)"
                });

              // Ocultar el mensaje
              const messageEl = document.querySelector('#bottom-message');
              if (messageEl) {
                gsap.to(messageEl, {
                  opacity: 0,
                  duration: 0.3,
                  ease: "power2.in"
                });
              }
            }
          })
          // Desvanecer
          .to(icon, {
            opacity: 0,
            scale: 0.3,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
              iconosEnCentro++;
              console.log(`Ícono ${index} llegó al centro. Total: ${iconosEnCentro}/${iconRefs.current.length}`);
              
              if (iconosEnCentro === iconRefs.current.length) {
                console.log("Iniciando animación final de sincronización");
                // Animación de sincronización completada
                gsap.timeline()
                  .to('.sync-trail', {
                    strokeDashoffset: 0,
                    opacity: 1,
                    duration: 1,
                    ease: "power1.inOut"
                  })
                  .to(['.success-check-bg', '.success-text-bg'], {
                    opacity: 1,
                    duration: 0.3,
                    ease: "power2.out"
                  })
                  .to('.success-check', {
                    strokeDashoffset: 0,
                    opacity: 1,
                    duration: 0.6,
                    ease: "power2.out"
                  }, "<")
                  .to('.success-text', {
                    opacity: 1,
                    duration: 0.4,
                    stagger: 0.1,
                    ease: "power2.out"
                  }, "-=0.3")
                  .to(['.success-check', '.sync-trail', '.success-text', '.success-check-bg', '.success-text-bg'], {
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.in"
                  }, "+=1");
                
                // Resetear contador para el próximo ciclo
                iconosEnCentro = 0;
              }
            }
          })
          // Esperar antes de reiniciar
          .to({}, { duration: 3 });

        masterTimeline.add(singleIconTimeline, index * tiempoEntreEntradas);
      });

      // Limpiar SVGs al desmontar
      return () => {
        svgTrail.remove();
        svgSuccess.remove();
        if (animationRef.current) {
          animationRef.current.kill();
        }
      };
    }
  }, [inView, isMobile, radius]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0%, 100% { opacity: 0; transform: translateY(20px) translateX(-50%); }
        20%, 80% { opacity: 1; transform: translateY(0) translateX(-50%); }
      }
      @keyframes morphBackground {
        0% {
          border-radius: '60% 40% 70% 30% / 45% 65% 35% 55%';
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          border-radius: '40% 60% 30% 70% / 55% 35% 65% 45%';
          transform: translate(-50%, -50%) scale(1.05);
        }
        100% {
          border-radius: '70% 30% 45% 55% / 35% 45% 55% 65%';
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Añadir animación para cambiar frases del título
  useEffect(() => {
    if (titleRef.current) {
      const changeTitlePhrase = () => {
        gsap.to(titleRef.current, {
          opacity: 0,
          y: -10,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            currentPhraseIndex.current = (currentPhraseIndex.current + 1) % titlePhrases.length;
            if (titleRef.current) {
              titleRef.current.textContent = titlePhrases[currentPhraseIndex.current];
              gsap.to(titleRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: "power2.out"
              });
            }
          }
        });
      };

      const interval = setInterval(changeTitlePhrase, 4000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        width: '100%',
        height: {
          xs: '50vh',
          sm: '60vh',
          md: '70vh'
        },
        minHeight: {
          xs: 400,
          sm: 450,
          md: 500
        },
        mx: 'auto',
        overflow: 'visible'
      }}
    >
      {/* Contenedor central */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 1,
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        {/* Título con estilo tooltip */}
        <Box
          sx={{
            position: 'relative',
            marginBottom: { xs: '20px', sm: '24px', md: '29px' },
            padding: { xs: '4px 12px', sm: '5px 14px', md: '6px 16px' },
            backgroundColor: 'rgba(230, 240, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(147, 197, 253, 0.25)',
            zIndex: 20,
            maxWidth: '90%',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              backgroundColor: 'inherit',
              boxShadow: '3px 3px 12px rgba(147, 197, 253, 0.15)',
              zIndex: -1
            }
          }}
        >
          <Box
            ref={titleRef}
            sx={{
              color: '#2D3748',
              fontWeight: 400,
              fontSize: {
                xs: '0.9rem',
                sm: '1rem',
                md: '1.1rem'
              },
              textAlign: 'center',
              fontFamily: '"Google Sans", "Segoe UI", Roboto, sans-serif',
              letterSpacing: '0.3px',
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              lineHeight: 1.4
            }}
          >
            {titlePhrases[0]}
          </Box>
        </Box>

        {/* Contenedor de la animación */}
        <Box
          sx={{
            position: 'relative',
            width: {
              xs: '300px',
              sm: '350px',
              md: '400px'
            },
            height: {
              xs: '300px',
              sm: '350px',
              md: '400px'
            },
          }}
        >
          {/* Partículas aleatorias */}
          {[...Array(50)].map((_, i) => (
            <Box
              key={`particle-${i}`}
              sx={{
                position: 'absolute',
                width: Math.random() * 6 + 2 + 'px',
                height: Math.random() * 6 + 2 + 'px',
                backgroundColor: i % 4 === 0 
                  ? 'rgba(66, 133, 244, 0.4)'
                  : i % 4 === 1 
                    ? 'rgba(15, 157, 88, 0.4)'
                    : i % 4 === 2
                      ? 'rgba(219, 68, 55, 0.4)'
                      : 'rgba(251, 188, 5, 0.4)',
                borderRadius: '50%',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
                zIndex: 1
              }}
            />
          ))}

          {/* Aura central */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '200px',
              height: '200px',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle at center, rgba(66, 133, 244, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              animation: 'pulse 3s ease-in-out infinite',
              zIndex: 1
            }}
          />

          {/* Centro */}
          <Box
            ref={centerRef}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: {
                xs: '100px',
                sm: '120px',
                md: '140px'
              },
              height: {
                xs: '100px',
                sm: '120px',
                md: '140px'
              },
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: '50%',
              padding: {
                xs: '15px',
                sm: '18px',
                md: '20px'
              },
              boxShadow: `
                0 0 30px rgba(66, 133, 244, 0.3),
                inset 0 0 30px rgba(66, 133, 244, 0.2)
              `,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translate(-50%, -50%) scale(1.1)',
                boxShadow: `
                  0 0 40px rgba(66, 133, 244, 0.4),
                  inset 0 0 40px rgba(66, 133, 244, 0.3)
                `
              }
            }}
          >
            <img
              src="/icons/process.png"
              alt="center-icon"
              style={{ 
                width: '100%', 
                height: '100%',
                filter: 'drop-shadow(0 0 8px rgba(66, 133, 244, 0.5))'
              }}
            />
          </Box>

          {/* Íconos en círculo */}
          {icons.map((icon, index) => {
            const angle = (icon.angleOffset * Math.PI) / 180;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            return (
              <Box
                key={index}
                ref={(el: HTMLDivElement | null) => {
                  if (el) iconRefs.current[index] = el;
                }}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: {
                    xs: 40,
                    sm: 45,
                    md: 50
                  },
                  height: {
                    xs: 40,
                    sm: 45,
                    md: 50
                  },
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '10px',
                  padding: {
                    xs: '6px',
                    sm: '7px',
                    md: '8px'
                  },
                  boxShadow: '0 6px 24px rgba(66, 133, 244, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1.2)`,
                    boxShadow: '0 8px 28px rgba(66, 133, 244, 0.3)',
                    background: 'rgba(255, 255, 255, 0.25)'
                  }
                }}
              >
                <img
                  src={icon.src}
                  alt={`icon-${index}`}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    transition: 'transform 0.3s ease'
                  }}
                />
              </Box>
            );
          })}

          {/* Mensajes para cada ícono */}
          {icons.map((icon, index) => {
            const angle = (icon.angleOffset * Math.PI) / 180;
            const messageRadius = radius + (isMobile ? 30 : 40);
            return (
              <Box
                key={`message-${index}`}
                ref={(el: HTMLDivElement | null) => {
                  if (el) messageRefs.current[index] = el;
                }}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${messageRadius * Math.cos(angle)}px, ${messageRadius * Math.sin(angle)}px)`,
                  color: '#2D3748',
                  fontSize: {
                    xs: '0.6rem',
                    sm: '0.65rem',
                    md: '0.7rem'
                  },
                  fontWeight: 400,
                  textAlign: 'center',
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: 10,
                  padding: {
                    xs: '3px 6px',
                    sm: '4px 7px',
                    md: '4px 8px'
                  },
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  whiteSpace: 'nowrap',
                  maxWidth: {
                    xs: '100px',
                    sm: '110px',
                    md: '120px'
                  },
                  lineHeight: 1.2,
                  display: {
                    xs: 'none',
                    sm: 'block'
                  }
                }}
              >
                {icon.message}
              </Box>
            );
          })}
        </Box>

        {/* Mensaje inferior */}
        <Box
          id="bottom-message"
          sx={{
            marginTop: { xs: '20px', sm: '22px', md: '25px' },
            color: '#2D3748',
            fontSize: {
              xs: '0.9rem',
              sm: '0.95rem',
              md: '1rem'
            },
            fontWeight: 500,
            textAlign: 'center',
            opacity: 0,
            zIndex: 20,
            fontFamily: '"Google Sans", "Segoe UI", Roboto, sans-serif',
            letterSpacing: '0.3px',
            backgroundColor: 'rgba(230, 240, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            padding: {
              xs: '5px 12px',
              sm: '5px 14px',
              md: '6px 16px'
            },
            borderRadius: '6px',
            boxShadow: '0 3px 8px rgba(147, 197, 253, 0.25)',
            maxWidth: {
              xs: '240px',
              sm: '260px',
              md: '280px'
            },
            margin: {
              xs: '20px auto 0',
              sm: '22px auto 0',
              md: '25px auto 0'
            },
            lineHeight: 1.4
          }}
        />
      </Box>
    </Box>
  );
};

export default GoogleSyncAnimation;
