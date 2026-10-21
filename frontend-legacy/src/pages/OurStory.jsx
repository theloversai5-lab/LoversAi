import React, { useEffect } from "react";
import { useLenis } from "../hooks/useLenis";
import OurStoryNavbar from "../components/OurStoryNavbar";
import Hero from "../components/Hero";
import About from "../components/About";
import TeamSection from "../components/TeamSection";
import Carousel from "../components/Carousel";

export default function OurStory() {
  useLenis();

  useEffect(() => {
    document.title = "Our Story | Lovers AI";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Learn about Lovers AI, the team behind it, and our presence.";
  }, []);


  return (
    <main>
      <OurStoryNavbar />
      <Hero />
      <About />
      <TeamSection />
      <Carousel />
    </main>
  );
}
