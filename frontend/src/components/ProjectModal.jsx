import React, { useState, useMemo } from 'react';
import Lightbox from './Lightbox';

const FadeIn = ({ children, className = "", delay = 0 }) => {
  return (
    <div className={`animate-fadeInUp ${className}`} style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}>
      {children}
    </div>
  );
};

const ProjectGallery = ({ project }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const allImages = useMemo(() => {
    const images = [];
    if (project.sections) {
      project.sections.forEach(section => {
        if (section.images) {
          images.push(...section.images);
        }
      });
    }
    return images;
  }, [project]);

  const handleNavigate = (direction) => {
    if (lightboxIndex === null) return;

    if (direction === "next") {
      setLightboxIndex((prev) => (prev + 1) % allImages.length);
    } else {
      setLightboxIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  const getGlobalIndex = (sectionIdx, imgIdx) => {
    let offset = 0;
    for (let i = 0; i < sectionIdx; i++) {
      if (project.sections[i].images) {
        offset += project.sections[i].images.length;
      }
    }
    return offset + imgIdx;
  };

  return (
    <>
      {project.sections && project.sections.map((section, sectionIdx) => (
        <FadeIn key={sectionIdx} className="container mx-auto px-6 md:px-12 mb-24">
          {(section.label || section.caption) && (
            <div className="max-w-3xl mx-auto text-center mb-12">
              {section.label && <h2 className="text-2xl md:text-3xl font-serif text-white mb-4">{section.label}</h2>}
              {section.caption && section.caption.trim() !== "" && (
                <p className="text-white/50 leading-relaxed">{section.caption}</p>
              )}
            </div>
          )}

          {section.images && section.images.length > 0 && (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {section.images.map((img, imgIdx) => {
                const globalIndex = getGlobalIndex(sectionIdx, imgIdx);
                return (
                  <div
                    key={imgIdx}
                    className="relative w-full break-inside-avoid overflow-hidden bg-[#1a100b] rounded-xl group cursor-pointer border border-white/5"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(globalIndex); }}
                  >
                    <img
                      src={img}
                      alt={`${section.label || 'Project Image'} ${imgIdx + 1}`}
                      className="w-full h-auto transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute bottom-3 right-3 pointer-events-none z-20 flex flex-col items-center opacity-90">
                      <span className="text-white text-[12px] md:text-[14px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider">@lovers ai</span>
                      <span className="text-white text-[14px] md:text-[16px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-widest leading-none mt-1">9821640951</span>
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 text-[#e6c6b2] bg-[#1c120c]/90 rounded-full p-3 shadow-lg border border-[#e6c6b2]/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FadeIn>
      ))}

      {lightboxIndex !== null && (
        <Lightbox
          images={allImages}
          currentIndex={lightboxIndex}
          onClose={(e) => { e?.stopPropagation(); setLightboxIndex(null); }}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
};

export default function ProjectModal({ project, onClose }) {
  if (!project) return null;

  let finalFeedbackSection = null;
  let gallerySections = [];

  if (project.sections) {
    finalFeedbackSection = project.sections.find(s => s.label === "Final Feedback" || s.label?.toLowerCase().includes("final feedback"));
    gallerySections = project.sections.filter(s => s !== finalFeedbackSection);
  }

  const galleryProject = { ...project, sections: gallerySections };
  const heroImage = project.cover || project.sections?.[0]?.images?.[0] || '/images/mandap-image.webp';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-7xl h-[90vh] bg-[#0a0604] overflow-y-auto rounded-[2rem] border border-white/10 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-6 z-[110] w-full flex justify-end px-6 h-0 pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto text-white/70 hover:text-[#e6c6b2] transition-all p-2 hover:scale-110 drop-shadow-xl"
            aria-label="Close Project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Immersive Hero Section */}
        <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden mb-16 rounded-t-[2rem]">
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>

          <FadeIn className="relative z-10 text-center text-white px-4">
            <h1 className="text-4xl md:text-7xl font-serif tracking-wide mb-6">{project.title}</h1>
            {project.location && (
              <p className="text-sm md:text-lg text-[#e6c6b2] uppercase tracking-widest">{project.location}</p>
            )}
          </FadeIn>
        </section>

        {/* Final Feedback Section at the Top */}
        {finalFeedbackSection && (
          <FadeIn className="container mx-auto px-6 md:px-12 mb-20">
            <div className="max-w-4xl mx-auto glass-card p-8 md:p-12 rounded-2xl text-center border border-[#e6c6b2]/20 relative bg-white/[0.04]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1a100b] px-6 py-2 rounded-full border border-[#e6c6b2]/30">
                <span className="text-[#e6c6b2] text-sm uppercase tracking-widest font-semibold">Client Love</span>
              </div>

              {finalFeedbackSection.caption && finalFeedbackSection.caption.toLowerCase() !== 'final feedback' && (
                <p className="text-xl md:text-2xl font-serif italic text-white leading-relaxed mt-4 mb-8">
                  "{finalFeedbackSection.caption}"
                </p>
              )}

              {finalFeedbackSection.images && finalFeedbackSection.images.length > 0 && (
                <div className={`mt-6 grid gap-6 ${finalFeedbackSection.images.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {finalFeedbackSection.images.map((img, idx) => (
                    <div key={idx} className="relative w-full rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={img}
                        alt={`Client Feedback ${idx + 1}`}
                        className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        <ProjectGallery project={galleryProject} />

        {/* Bottom padding spacing for scrollable modal */}
        <div className="pb-24"></div>
      </div>
    </div>
  );
}
