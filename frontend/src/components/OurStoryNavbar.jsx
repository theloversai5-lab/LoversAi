import { Link } from 'react-router-dom'
import styles from '../styles/OurStoryNavbar.module.css'
export default function OurStoryNavbar() {
  const handleScroll = (e, id) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      // Update url hash without jumping
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <nav className={styles.nav}>
      <Link to="/" className="pointer-events-auto z-50">
        <img
          src="/images/logo copy.png"
          alt="Lovers AI logo"
          className="h-[95px] w-auto object-contain transition-transform duration-300 hover:scale-105"
        />
      </Link>

      <ul className={styles.links}>
        <li>
          <a href="#about" onClick={(e) => handleScroll(e, "about")}>About</a>
        </li>
        <li>
          <a href="#team" onClick={(e) => handleScroll(e, "team")}>Team</a>
        </li>
        <li>
          <a href="#presence" onClick={(e) => handleScroll(e, "presence")}>Presence</a>
        </li>
      </ul>
    </nav>
  )
}
