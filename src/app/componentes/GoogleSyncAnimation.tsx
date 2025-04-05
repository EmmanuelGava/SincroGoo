import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import gsap from 'gsap';
import { useInView } from 'react-intersection-observer';

interface IconData {
  src: string;
  angleOffset: number;
  message: string;
}

const radius = 160;

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

const titlePhrases = [
  "Gestión inteligente de documentos",
  "Sincronización automática en tiempo real",
  "Organización eficiente de archivos",
  "Colaboración en equipo simplificada",
  "Integración con múltiples plataformas",
  "Respaldo seguro en la nube"
];

const GoogleSyncAnimation: React.FC = () => {
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

      const tiempoEnGrupo = 4;
      const tiempoEntreEntradas = 0.8;
      const tiempoEnPosicionInicial = 2;
      
      iconRefs.current.forEach((icon, index) => {
        const originalPos = calculateOriginalPosition(index);
        
        const singleIconTimeline = gsap.timeline()
          // Estado inicial
          .set(icon, { 
            scale: 1, 
            opacity: 1,
            transform: `translate(-50%, -50%) translate(${originalPos.x}px, ${originalPos.y}px)`,
            zIndex: 1
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
              const centerRect = centerRef.current!.getBoundingClientRect();
              return ((centerRect.left + centerRect.width/2 - rect.left) / rect.width) * 100;
            },
            yPercent: () => {
              const rect = icon.getBoundingClientRect();
              const centerRect = centerRef.current!.getBoundingClientRect();
              return ((centerRect.top + centerRect.height/2 - rect.top) / rect.height) * 100;
            },
            scale: 0.6,
            rotation: "+=360",
            duration: 2,
            ease: "power2.inOut",
            onStart: () => {
              // Efecto de estela
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
                  boxShadow: '0 0 50px rgba(66, 133, 244, 0.8), inset 0 0 40px rgba(66, 133, 244, 0.6)',
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
            ease: "power2.in"
          })
          // Esperar mientras están dentro
          .to({}, { 
            duration: () => {
              const tiempoRestanteEntradas = (iconRefs.current.length - 1 - index) * tiempoEntreEntradas;
              return tiempoRestanteEntradas + tiempoEnGrupo;
            }
          })
          // Reaparecer desde el centro
          .set(icon, {
            xPercent: () => {
              const rect = icon.getBoundingClientRect();
              const centerRect = centerRef.current!.getBoundingClientRect();
              return ((centerRect.left + centerRect.width/2 - rect.left) / rect.width) * 100;
            },
            yPercent: () => {
              const rect = icon.getBoundingClientRect();
              const centerRect = centerRef.current!.getBoundingClientRect();
              return ((centerRect.top + centerRect.height/2 - rect.top) / rect.height) * 100;
            },
            opacity: 0,
            scale: 0.3
          })
          // Aparecer y volver a posición original
          .to(icon, {
            opacity: 1,
            scale: 0.6,
            duration: 0.5,
            ease: "power2.out",
            onStart: () => {
              gsap.to(centerRef.current, {
                scale: 1.2,
                duration: 0.3,
                yoyo: true,
                repeat: 1
              });
            }
          })
          .to(icon, {
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            rotation: 0,
            duration: 1.5,
            ease: "power2.inOut"
          })
          // Mantener en posición inicial
          .to({}, { duration: tiempoEnPosicionInicial });

        masterTimeline.add(singleIconTimeline, index * tiempoEntreEntradas);
      });

      animationRef.current = masterTimeline;
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [inView]);

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
        height: '70vh',
        minHeight: 500,
        mx: 'auto',
        overflow: 'visible',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '160%',
          height: '120%',
          transform: 'translate(-50%, -50%)',
          background: `
            radial-gradient(circle at 30% 20%, rgba(66, 133, 244, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 70% 65%, rgba(15, 157, 88, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 85% 25%, rgba(219, 68, 55, 0.08) 0%, transparent 55%),
            radial-gradient(circle at 15% 75%, rgba(251, 188, 5, 0.08) 0%, transparent 50%),
            linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 157, 88, 0.1) 50%, rgba(219, 68, 55, 0.08) 100%)
          `,
          borderRadius: '60% 40% 70% 30% / 45% 65% 35% 55%',
          animation: 'morphBackground 20s ease-in-out infinite alternate',
          filter: 'blur(16px)',
          zIndex: 0
        }
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
          zIndex: 1
        }}
      >
        {/* Título con estilo tooltip */}
        <Box
          sx={{
            position: 'relative',
            marginBottom: '29px',
            padding: '6px 16px',
            backgroundColor: 'rgba(230, 240, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(147, 197, 253, 0.25)',
            zIndex: 20,
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
              fontSize: '1.1rem',
              textAlign: 'center',
              fontFamily: '"Google Sans", "Segoe UI", Roboto, sans-serif',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
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
            width: 400,
            height: 400,
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
              width: 140,
              height: 140,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: '50%',
              padding: '20px',
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
                  width: 50,
                  height: 50,
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '10px',
                  padding: '8px',
                  boxShadow: '0 6px 24px rgba(66, 133, 244, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1.2)`,
                    boxShadow: '0 8px 28px rgba(66, 133, 244, 0.3)',
                    background: 'rgba(255, 255, 255, 0.25)'
                  },
                  '& img': {
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 0 8px rgba(66, 133, 244, 0.4))'
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
            const messageRadius = radius + 40;
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
                  fontSize: '0.7rem',
                  fontWeight: 400,
                  textAlign: 'center',
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: 10,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  whiteSpace: 'nowrap',
                  maxWidth: '120px',
                  lineHeight: 1.2,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'inherit',
                    transform: 'rotate(45deg)',
                    top: '50%',
                    left: angle > Math.PI ? 'auto' : '-3px',
                    right: angle > Math.PI ? '-3px' : 'auto',
                    marginTop: '-3px',
                    boxShadow: angle > Math.PI ? '2px 0px 2px rgba(0, 0, 0, 0.05)' : '-2px 0px 2px rgba(0, 0, 0, 0.05)',
                    zIndex: -1
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
            marginTop: '25px',
            color: '#2D3748',
            fontSize: '1rem',
            fontWeight: 500,
            textAlign: 'center',
            opacity: 0,
            zIndex: 20,
            fontFamily: '"Google Sans", "Segoe UI", Roboto, sans-serif',
            letterSpacing: '0.3px',
            backgroundColor: 'rgba(230, 240, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            padding: '6px 16px',
            borderRadius: '6px',
            boxShadow: '0 3px 8px rgba(147, 197, 253, 0.25)',
            maxWidth: '280px',
            margin: '25px auto 0',
            lineHeight: 1.4
          }}
        />
      </Box>
    </Box>
  );
};

export default GoogleSyncAnimation;
