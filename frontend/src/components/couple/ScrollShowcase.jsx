import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const panels = [
  {
    id: "panel2-left",
    label: "Panel 2",
    title: "",
    image: "/images/couple/3.png",
    variant: "side",
  },
  {
    id: "panel1-hero",
    label: "Panel 1",
    title: "Your Perfect Wedding",
    video: "/images/couple/couple entry page .mp4",
    variant: "hero",
  },
  {
    id: "panel3-right",
    label: "Panel 3",
    title: "",
    image: "/images/couple/1.jpg",
    variant: "sideLarge",
  },
];

const HERO_WIDTH = 580;
const HERO_HEIGHT = 760;
const SIDE_WIDTH = 380;
const SIDE_HEIGHT = 520;
const SIDE_LARGE_WIDTH = 380;
const SIDE_LARGE_HEIGHT = 520;

export default function ScrollShowcase() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const heroRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const heroCard = heroRef.current;
    const leftCard = leftRef.current;
    const rightCard = rightRef.current;

    if (!section || !track || !heroCard || !leftCard || !rightCard) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      let timeline;

      const setup = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const cards = [heroCard, leftCard, rightCard];
        const heroFrameWidth = Math.min(
          viewportWidth - (viewportWidth < 768 ? 40 : 120),
          1480,
        );
        const heroFrameHeight = Math.min(
          viewportHeight - (viewportWidth < 768 ? 180 : 190),
          760,
        );
        const heroStartY = viewportWidth < 768 ? 38 : 56;

        // Reset transforms before measuring so refreshes don't compound offsets.
        gsap.set(cards, {
          clearProps: "transform,opacity,borderRadius,boxShadow",
        });

        const heroWidth = heroCard.offsetWidth;
        const heroHeight = heroCard.offsetHeight;
        const sideWidth = leftCard.offsetWidth;
        const gap = gsap.utils.clamp(18, 40, viewportWidth * 0.028);
        const centeredSideOffset = heroWidth / 2 + sideWidth / 2 + gap;
        const offscreenSideOffset = viewportWidth / 2 + sideWidth * 0.9;
        const heroScale = Math.max(
          heroFrameWidth / heroWidth,
          heroFrameHeight / heroHeight,
        );
        const sideLift = Math.min(48, viewportHeight * 0.06);

        gsap.set(track, {
          opacity: 1,
        });

        gsap.set(heroCard, {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: heroStartY,
          scale: heroScale,
          borderRadius: 18,
          zIndex: 3,
          force3D: true,
          transformOrigin: "center center",
          willChange: "transform, border-radius",
        });

        gsap.set([leftCard, rightCard], {
          xPercent: -50,
          yPercent: -50,
          scale: 0.94,
          opacity: 0.7,
          force3D: true,
          transformOrigin: "center center",
          willChange: "transform, opacity",
        });

        gsap.set(leftCard, {
          x: -offscreenSideOffset,
          y: sideLift,
          zIndex: 1,
        });

        gsap.set(rightCard, {
          x: offscreenSideOffset,
          y: sideLift,
          zIndex: 1,
        });

        timeline = gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * 2.4}`,
            scrub: 1.15,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(
            heroCard,
            {
              scale: 1,
              y: 0,
              borderRadius: 28,
              duration: 1.2,
            },
            0,
          )
          .to(
            leftCard,
            {
              x: -centeredSideOffset,
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 1.2,
            },
            0.08,
          )
          .to(
            rightCard,
            {
              x: centeredSideOffset,
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 1.2,
            },
            0.08,
          )
          .to(
            heroCard,
            {
              y: -8,
              boxShadow: "0 38px 100px rgba(0, 0, 0, 0.34)",
              duration: 0.9,
            },
            0.55,
          )
          .to(
            [leftCard, rightCard],
            {
              y: 10,
              boxShadow: "0 26px 64px rgba(0, 0, 0, 0.24)",
              duration: 0.9,
            },
            0.55,
          );
      };

      const rebuild = () => {
        if (timeline) {
          timeline.scrollTrigger?.kill();
          timeline.kill();
        }

        setup();
      };

      rebuild();
      ScrollTrigger.addEventListener("refreshInit", rebuild);

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", rebuild);
        timeline?.scrollTrigger?.kill();
        timeline?.kill();
      };
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} style={sectionStyle}>
      <div style={shellStyle}>
        <div style={haloStyle} />
        <div style={viewportStyle}>
          <div ref={trackRef} style={trackStyle}>
            {panels.map((panel) => (
              <article
                key={panel.id}
                ref={(node) => {
                  if (panel.id === "panel2-left") leftRef.current = node;
                  if (panel.id === "panel1-hero") heroRef.current = node;
                  if (panel.id === "panel3-right") rightRef.current = node;
                }}
                style={getCardStyle(panel.variant)}
              >
                {panel.video ? (
                  <video autoPlay loop muted playsInline style={imageStyle}>
                    <source src={panel.video} type="video/mp4" />
                  </video>
                ) : (
                  <img src={panel.image} alt={panel.label} style={imageStyle} />
                )}
                <div style={overlayStyle} />
                <div style={copyStyle}>
                  <h2 style={titleStyle}>{panel.title}</h2>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getCardStyle(variant) {
  return {
    ...cardBaseStyle,
    ...(variant === "hero"
      ? heroCardStyle
      : variant === "sideLarge"
        ? sideLargeCardStyle
        : sideCardStyle),
  };
}

// Background made transparent to show parent page background image
const sectionStyle = {
  position: "relative",
  height: "100vh",
  overflow: "hidden",
  background: "transparent",
};

const shellStyle = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const haloStyle = {
  position: "absolute",
  inset: "8% 6%",
  borderRadius: "40px",
  background: "transparent",
  filter: "blur(28px)",
  pointerEvents: "none",
};

const viewportStyle = {
  position: "relative",
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
};

const trackStyle = {
  position: "relative",
  width: "100%",
  height: "100%",
  opacity: 0,
};

const cardBaseStyle = {
  position: "absolute",
  left: "50%",
  top: "50%",
  overflow: "hidden",
  background: "#050505",
  isolation: "isolate",
};

const heroCardStyle = {
  width: `min(${HERO_WIDTH}px, calc(100vw - 40px))`,
  height: `min(${HERO_HEIGHT}px, calc(100vh - 48px))`,
  borderRadius: "32px",
  boxShadow: "0 44px 120px rgba(0, 0, 0, 0.36)",
};

const sideCardStyle = {
  width: `min(${SIDE_WIDTH}px, calc((100vw - 64px) / 2.9))`,
  height: `min(${SIDE_HEIGHT}px, calc(100vh - 180px))`,
  minWidth: "240px",
  minHeight: "360px",
  borderRadius: "28px",
  boxShadow: "0 26px 64px rgba(0, 0, 0, 0.24)",
};

const sideLargeCardStyle = {
  width: `min(${SIDE_LARGE_WIDTH}px, calc((100vw - 64px) / 2.7))`,
  height: `min(${SIDE_LARGE_HEIGHT}px, calc(100vh - 180px))`,
  minWidth: "240px",
  minHeight: "360px",
  borderRadius: "28px",
  boxShadow: "0 26px 64px rgba(0, 0, 0, 0.24)",
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(10, 8, 7, 0.04) 0%, rgba(10, 8, 7, 0.14) 45%, rgba(10, 8, 7, 0.56) 100%)",
};

const copyStyle = {
  position: "absolute",
  left: "clamp(18px, 2.4vw, 28px)",
  right: "clamp(18px, 2.4vw, 28px)",
  bottom: "clamp(18px, 2.8vw, 30px)",
  zIndex: 1,
};

const titleStyle = {
  fontSize: "clamp(24px, 3.4vw, 44px)",
  lineHeight: 1.02,
  fontWeight: 500,
  fontFamily: '"DM Serif Display", serif',
  color: "#f8f1e8",
  textWrap: "balance",
};
