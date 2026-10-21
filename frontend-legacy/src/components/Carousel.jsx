import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import styles from '../styles/Carousel.module.css'
import img1 from '../assets/images/img1.png'
import img2 from '../assets/images/img2.png'
import img3 from '../assets/images/img3.png'
import img4 from '../assets/images/img4.png'

const SLIDES = [
  {
    id: 1,
    image: img1,
    location: 'Mumbai, India',
  },
  {
    id: 2,
    image: img2,
    location: 'Mumbai, India',
  },
  {
    id: 3,
    image: img3,
    location: 'Mumbai, India',
  },
  {
    id: 4,
    image: img4,
    location: 'Shark Tank India Pre-Finalist',
  }
]

const DURATION = 5000 // ms per slide

export default function Carousel() {
  const [current, setCurrent]   = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const timerRef = useRef(null)

  const sectionRef = useRef(null)
  const inView     = useInView(sectionRef, { once: true, margin: '-60px' })

  const goTo = useCallback((index, dir) => {
    setDirection(dir)
    setCurrent((index + SLIDES.length) % SLIDES.length)
  }, [])

  const next = useCallback(() => goTo(current + 1,  1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo])

  // Auto-advance
  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(next, DURATION)
  }, [next])

  useEffect(() => {
    resetTimer()
    return () => clearInterval(timerRef.current)
  }, [resetTimer])

  // Swipe support
  const touchStart = useRef(0)
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX }
  const handleTouchEnd   = (e) => {
    const delta = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) { delta > 0 ? next() : prev(); resetTimer() }
  }

  // Slide variants — images slide + zoom
  const imageVariants = {
    enter: (dir) => ({ x: `${dir * 8}%`, scale: 1.12, opacity: 0 }),
    center:        { x: '0%', scale: 1.04, opacity: 1,
      transition: { duration: 1.1, ease: [0.77, 0, 0.18, 1] } },
    exit: (dir)  => ({ x: `${-dir * 8}%`, scale: 1.0, opacity: 0,
      transition: { duration: 0.8, ease: [0.77, 0, 0.18, 1] } }),
  }

  const captionVariants = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0,
      transition: { duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit:   { opacity: 0, y: -10, transition: { duration: 0.3 } },
  }

  return (
    <section id="presence" className={styles.section} ref={sectionRef}>
      {/* Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <p className={styles.label}>Across India</p>
        <h2 className={`${styles.title} font-dream`}>Our Presence</h2>
        <div className={styles.divider} />
      </motion.div>

      {/* Carousel */}
      <div
        className={styles.carousel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides */}
        <AnimatePresence custom={direction} mode="sync">
          <motion.div
            key={SLIDES[current].id}
            className={styles.slide}
            custom={direction}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ backgroundImage: `url(${SLIDES[current].image})` }}
          >
            <div className={styles.overlay} />

            {/* Caption */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`cap-${SLIDES[current].id}`}
                className={styles.caption}
                variants={captionVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <p className={styles.slideLocation}>{SLIDES[current].location}</p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Arrows */}
        <button className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => { prev(); resetTimer() }} aria-label="Previous">
          ←
        </button>
        <button className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => { next(); resetTimer() }} aria-label="Next">
          →
        </button>

        {/* Progress dots */}
        <div className={styles.dots}>
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => { goTo(i, i > current ? 1 : -1); resetTimer() }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <motion.div
            key={current}
            className={styles.progressFill}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: DURATION / 1000, ease: 'linear' }}
          />
        </div>
      </div>
    </section>
  )
}