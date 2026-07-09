import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import styles from '../styles/About.module.css'
import group2Bg from '../assets/images/Group2.png'

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 32 },
  show:   {
    opacity: 1, y: 0,
    transition: { duration: 0.85, delay, ease: [0.25, 0.46, 0.45, 0.94] }
  }
})

export default function About() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const state  = inView ? 'show' : 'hidden'

  return (
    <section
      id="about"
      className={styles.about}
      ref={ref}
      style={{
        backgroundImage: `url("${group2Bg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className={styles.overlay} />
      <div className={styles.contentWrapper}>
        <div className={styles.topLine} />

        <motion.p className={styles.label} variants={fadeUp(0)} initial="hidden" animate={state}>
        Who We Are
      </motion.p>

      <motion.h2 className={`${styles.title} font-dream`} variants={fadeUp(0.1)} initial="hidden" animate={state}>
        About Us
      </motion.h2>

      <motion.div className={styles.divider} variants={fadeUp(0.15)} initial="hidden" animate={state} />

      <motion.p className={styles.body} variants={fadeUp(0.2)} initial="hidden" animate={state}>
        We are a wedding AI startup that helps you bring your dream wedding come true,
        connecting all couples, planners and vendors together.
      </motion.p>

      <motion.p className={styles.note} variants={fadeUp(0.28)} initial="hidden" animate={state}>
        Already working with pioneer planners and brands pan India and launching
        the highly awaited ecosystem soon.
      </motion.p>

      <motion.a href="#" className={styles.btn} variants={fadeUp(0.35)} initial="hidden" animate={state}>
        Join Founder's Office
      </motion.a>

      <motion.p className={`${styles.quote} ${styles.dreamQuote}`} variants={fadeUp(0.45)} initial="hidden" animate={state}>
        "Amazon of Indian Wedding Industry"
      </motion.p>
      </div>
    </section>
  )
}