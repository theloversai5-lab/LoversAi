import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import styles from '../styles/TeamSection.module.css'

/* ── team photos ── */
import aanshaImg from '../assets/images/team/aanssha.jpg'
import nehaImg from '../assets/images/team/Neha.jpg'
import pratikImg from '../assets/images/team/Pratik.jpeg'
import bineetImg from '../assets/images/team/Bineet.jpg'
import piyushImg from '../assets/images/team/Piyush.jpg'

/* ── team data ── */
const team = [
  {
    name: 'Aanssha',
    role: 'Founder & CEO',
    bio: 'With 7 years deep in the wedding industry, Aanssha identified a critical gap - the disconnect between couples, planners, and vendors. She founded Lovers AI to bridge that divide, empowering wedding planners with intelligent technology and transforming how dream weddings come to life across India.',
    image: aanshaImg,
    initials: 'A',
  },
  {
    name: 'Neha',
    role: 'Head of Sales & Marketing',
    bio: 'Bringing fresh energy and a fearless hustle to Lovers AI, Neha has hit the ground running in her very first sales role and she\'s already making waves. Over the past 3 months, she\'s been instrumental in building key partnerships and amplifying the brand\'s presence across the wedding ecosystem.',
    image: nehaImg,
    initials: 'N',
  },
  {
    name: 'Pratik Tiwari',
    role: 'AI Engineer',
    bio: 'A sharp undergrad with a natural gift for building intelligent systems, Pratik is the technical mind powering Lovers AI\'s smart matching and recommendation engine. His ability to transform complex AI concepts into elegant, production-ready solutions makes him a cornerstone of the engineering team.',
    image: pratikImg,
    initials: 'PT',
  },
  {
    name: 'Bineet',
    role: 'Full Stack Engineer',
    bio: 'From pixel-perfect interfaces to robust server architectures, Bineet bridges the gap between design vision and production reality. His full-stack expertise ensures every feature ships seamlessly - polished, performant, and built to scale.',
    image: bineetImg,
    initials: 'B',
  },
  {
    name: 'Piyush',
    role: 'Full Stack Engineer',
    bio: 'A versatile engineer who thrives at the intersection of frontend craft and backend precision, Piyush brings speed and reliability to every deployment. His end-to-end ownership across the stack keeps the platform running smoothly from day one.',
    image: piyushImg,
    initials: 'P',
  },
]

/* ── animation helpers ── */
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  },
})

const fadeSlide = (direction, delay = 0) => ({
  hidden: { opacity: 0, x: direction === 'left' ? -60 : 60 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  },
})

/* ── single team-member row ── */
function MemberRow({ member, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const state = inView ? 'show' : 'hidden'

  /* Even index → pic LEFT, bio RIGHT.  Odd → pic RIGHT, bio LEFT. */
  const isReversed = index % 2 !== 0

  const handleImgError = (e) => {
    e.target.style.display = 'none'
    e.target.nextElementSibling.style.display = 'flex'
  }

  return (
    <div
      ref={ref}
      className={`${styles.memberRow} ${isReversed ? styles.reversed : ''}`}
    >
      {/* ── photo ── */}
      <motion.div
        className={styles.photoWrap}
        variants={fadeSlide(isReversed ? 'right' : 'left')}
        initial="hidden"
        animate={state}
      >
        <div className={styles.circleGlow} />
        <div className={styles.circleFrame}>
          <img
            src={member.image}
            alt={member.name}
            className={styles.photo}
            onError={handleImgError}
          />
          {/* fallback initials avatar */}
          <span className={styles.initialsAvatar} style={{ display: 'none' }}>
            {member.initials}
          </span>
        </div>
      </motion.div>

      {/* ── bio ── */}
      <motion.div
        className={styles.bioWrap}
        variants={fadeSlide(isReversed ? 'left' : 'right', 0.15)}
        initial="hidden"
        animate={state}
      >
        <span className={styles.memberLabel}>{member.role}</span>
        <h3 className={`${styles.memberName} font-dream`}>{member.name}</h3>
        <div className={styles.memberDivider} />
        <p className={styles.memberBio}>{member.bio}</p>
      </motion.div>
    </div>
  )
}

/* ── main section ── */
export default function TeamSection() {
  const headRef = useRef(null)
  const headInView = useInView(headRef, { once: true, margin: '-60px' })
  const headState = headInView ? 'show' : 'hidden'

  return (
    <section id="team" className={styles.section}>
      {/* decorative top line */}
      <div className={styles.topLine} />

      {/* section header */}
      <div ref={headRef} className={styles.header}>
        <motion.p
          className={styles.label}
          variants={fadeUp(0)}
          initial="hidden"
          animate={headState}
        >
          The People Behind the Vision
        </motion.p>

        <motion.h2
          className={`${styles.title} font-dream`}
          variants={fadeUp(0.1)}
          initial="hidden"
          animate={headState}
        >
          Meet Our Team
        </motion.h2>

        <motion.div
          className={styles.divider}
          variants={fadeUp(0.18)}
          initial="hidden"
          animate={headState}
        />

        <motion.p
          className={styles.subtitle}
          variants={fadeUp(0.25)}
          initial="hidden"
          animate={headState}
        >
          A passionate crew of dreamers, builders, and wedding enthusiasts
          turning the impossible into the inevitable.
        </motion.p>
      </div>

      {/* team members */}
      <div className={styles.members}>
        {team.map((m, i) => (
          <MemberRow key={m.name} member={m} index={i} />
        ))}
      </div>
    </section>
  )
}
