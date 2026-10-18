'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Sparkles, ChevronDown, Check, Layers } from 'lucide-react'

interface HeroSectionProps {
  onUseApp: () => void
}

const workflowSteps = [
  {
    step: '01',
    title: 'Empty lawn',
    detail: 'See the space open and clear',
    image: '/playground-01-empty.png',
    dockIcon: '○',
    assistantNote: 'Space ready. Where would you like the stage?',
  },
  {
    step: '02',
    title: 'Ceremony stage',
    detail: 'Set the main sacred mandap',
    image: '/playground-02-stage.png',
    dockIcon: '⌂',
    assistantNote: 'Mandap stage set. Adding guest seating next.',
  },
  {
    step: '03',
    title: 'Guest seating',
    detail: 'Arrange chairs along the aisle',
    image: '/playground-03-seating.png',
    dockIcon: '▤',
    assistantNote: 'Aisles aligned for 250 guests.',
  },
  {
    step: '04',
    title: 'Florals & decor',
    detail: 'Complete with flowers and canopy',
    image: '/playground-04-decor.png',
    dockIcon: '✧',
    assistantNote: 'Sunset mandap styled and ready to share.',
  },
]

export default function HeroSection({ onUseApp }: HeroSectionProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % workflowSteps.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [isPlaying])

  const active = workflowSteps[currentStep]

  return (
    <section className="hero-wrap" id="top">

      {/* ── Main content ── */}
      <div className="hero-content">

        {/* Display headline */}
        <h1 className="hero-title">
          <span className="hero-title-line1">#1 AI Wedding</span>
          <span className="hero-title-line2">Planner Platform</span>
        </h1>

        {/* Tagline */}
        <p className="hero-tagline">
          Design your perfect wedding with AI. <br />
          Find vendors, plan details, and bring your vision to life.
        </p>

        {/* CTA */}
        <div className="hero-cta-row">
          <button
            type="button"
            className="glassmorphic-btn"
            onClick={onUseApp}
            id="hero-use-app-btn"
          >
            <span className="btn-text">Start planning</span>
            <div className="btn-icon">
              <ArrowRight size={16} strokeWidth={2.5} />
            </div>
            <div className="circle-overlay"></div>
          </button>
        </div>

        {/* ── Device frame ── */}
        <div className="device-frame" id="moodboard">

          {/* Topbar */}
          <div className="device-topbar">
            <div className="device-topbar-left">
              <span className="device-app-brand">♜ Studio</span>
            </div>
            <div className="device-topbar-center">
            </div>
            <div className="device-topbar-right">
              <span className="device-badge">Step {active.step}/04</span>
              <button
                type="button"
                className="device-control-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause animation' : 'Play animation'}
                aria-label="Toggle playback"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          </div>

          {/* Inner canvas */}
          <div className="device-inner-canvas">
            <div className="canvas-window-bar">
              <div className="canvas-window-dots">
                <span className="dot dot-close" />
                <span className="dot dot-min" />
                <span className="dot dot-max" />
              </div>
              <div className="canvas-window-title">
                {active.title} — {active.detail}
              </div>
              <div className="canvas-window-actions">
                <span className="canvas-chip">
                  <Layers size={11} /> 4 Layers
                </span>
              </div>
            </div>

            <div className="canvas-media-viewport">
              <Image
                src={active.image}
                alt={`Wedding moodboard: ${active.title}`}
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1100px"
                className="canvas-scene-img"
              />

              {/* Floating assistant card */}
              <div className="floating-assistant-card">
                <div className="assistant-card-header">
                  <span className="assistant-pill-tag">
                    <Sparkles size={11} /> ALC Assistant
                  </span>
                  <span className="assistant-step-count">{active.step} of 04</span>
                </div>
                <p className="assistant-card-msg">
                  &ldquo;{active.assistantNote}&rdquo;
                </p>
                <div className="assistant-action-chips">
                  {workflowSteps.map((step, idx) => (
                    <button
                      key={step.title}
                      type="button"
                      className={`assistant-chip ${currentStep === idx ? 'chip-active' : ''}`}
                      onClick={() => {
                        setCurrentStep(idx)
                        setIsPlaying(false)
                      }}
                    >
                      {currentStep > idx ? <Check size={10} /> : null}
                      <span>{step.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {currentStep >= 1 && (
                <div className="scene-decor-pin pin-stage">
                  <span>Mandap stage placed</span>
                </div>
              )}
              {currentStep >= 2 && (
                <div className="scene-decor-pin pin-seating">
                  <span>Guest seating aligned</span>
                </div>
              )}
              {currentStep >= 3 && (
                <div className="scene-decor-pin pin-florals">
                  <span>Sunset florals active</span>
                </div>
              )}
            </div>

            {/* Dock */}
            <div className="device-mac-dock" role="tablist" aria-label="Workflow steps">
              {workflowSteps.map((step, idx) => (
                <button
                  key={step.title}
                  type="button"
                  role="tab"
                  aria-selected={currentStep === idx}
                  className={`dock-item ${currentStep === idx ? 'dock-item-active' : ''}`}
                  onClick={() => {
                    setCurrentStep(idx)
                    setIsPlaying(false)
                  }}
                  title={step.title}
                >
                  <span className="dock-icon">{step.dockIcon}</span>
                  <span className="dock-label">{step.title}</span>
                  {currentStep === idx && <span className="dock-active-dot" />}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
