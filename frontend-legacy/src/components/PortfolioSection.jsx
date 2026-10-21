import React, { useState } from 'react';
import ProjectCard from './ProjectCard';
import FeedbackCarousel from './FeedbackCarousel';
import LinkCard from './LinkCard';
import ProjectModal from './ProjectModal';
import { getFormattedProjects, getAllFeedbackImages } from './portfolioData';

const PortfolioSection = () => {
  const projectsData = getFormattedProjects();
  const feedbackImages = getAllFeedbackImages();

  const [selectedProject, setSelectedProject] = useState(null);

  const openProject = (project) => {
    setSelectedProject(project);
    document.body.style.overflow = 'hidden';
  };

  const closeProject = () => {
    setSelectedProject(null);
    document.body.style.overflow = 'auto';
  };

  return (
    <section className="relative overflow-hidden bg-[#0b0706] pt-20 pb-8 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,236,220,0.08),transparent_30%)]" />

      <div className="relative z-10 text-center mb-16">
        <h2 className="text-[#fff4e8] heading-font" style={{ fontWeight: 400, fontSize: '72px', letterSpacing: '-0.02em', lineHeight: '1' }}>
          Our Past Work
        </h2>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Slot 1: Feedback Carousel */}
        <div className="col-span-1 h-full w-full">
          <FeedbackCarousel images={feedbackImages} />
        </div>

        {/* Slots 2-5: Project Cards */}
        {projectsData.slice(0, 4).map(project => (
          <div key={project.id} className="col-span-1 h-full w-full">
            <ProjectCard project={project} onClick={() => openProject(project)} />
          </div>
        ))}

        {/* Slot 6: Link Card */}
        <div className="col-span-1 h-full w-full">
          <LinkCard />
        </div>
      </div>

      {selectedProject && (
        <ProjectModal 
          project={selectedProject} 
          onClose={closeProject} 
        />
      )}
    </section>
  );
};

export default PortfolioSection;
