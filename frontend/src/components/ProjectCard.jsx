import React from "react";

const ProjectCard = ({ project, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="glass-card group cursor-pointer flex flex-col p-4 rounded-[28px] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(230,198,178,0.15)] bg-white/[0.04] border border-white/10 hover:border-[#e6c6b2]/50 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.22)] h-[540px] w-full"
    >
      <div className="relative w-full flex-1 overflow-hidden mb-6 rounded-2xl bg-[#1a100b]">
        {project.cover ? (
          <img
            src={project.cover}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50">
            No Image
          </div>
        )}
      </div>
      <div className="px-2 pb-2">
        <h3 className="text-xl font-serif text-white group-hover:text-[#e6c6b2] transition-colors">{project.title}</h3>
        {project.location && (
          <p className="text-sm text-white/50 uppercase tracking-wider mt-2">{project.location}</p>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
