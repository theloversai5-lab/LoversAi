'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PortfolioProject {
  id: string;
  title: string;
  date: string;
  location: string;
  images: string[];
  description: string;
  tags: string[];
}

const MOCK_PROJECTS: PortfolioProject[] = [
  {
    id: 'p1',
    title: 'Priya & Raj Wedding',
    date: '2026-05-15',
    location: 'Jaipur',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600',
    ],
    description: 'Royal palace wedding with 400 guests. Beautiful sunset ceremony.',
    tags: ['Royal', 'Sunset', 'Palace'],
  },
  {
    id: 'p2',
    title: 'Neha & Arjun Reception',
    date: '2026-03-20',
    location: 'Mumbai',
    images: [
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600',
      'https://images.unsplash.com/photo-1606800052052-c7d53c75e140?w=600',
    ],
    description: 'Beach resort destination wedding. Intimate gathering of 150 guests.',
    tags: ['Beach', 'Destination', 'Intimate'],
  },
];

export default function VendorPortfolioPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    tags: [''],
  });

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const project: PortfolioProject = {
      id: `p${projects.length + 1}`,
      ...newProject,
      images: [
        'https://images.unsplash.com/photo-1519167758481-83f29da8d3d0?w=600',
      ],
      tags: newProject.tags.filter((t) => t.trim() !== ''),
    };
    setProjects([...projects, project]);
    setShowAddModal(false);
    setNewProject({
      title: '',
      date: '',
      location: '',
      description: '',
      tags: [''],
    });
  };

  const addTag = () => {
    setNewProject({
      ...newProject,
      tags: [...newProject.tags, ''],
    });
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...newProject.tags];
    newTags[index] = value;
    setNewProject({ ...newProject, tags: newTags });
  };

  const removeTag = (index: number) => {
    setNewProject({
      ...newProject,
      tags: newProject.tags.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#F08A3C]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/vendor')}
            className="text-[#1E4636]/70 hover:text-[#1E4636] mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#1E4636] mb-2">
                My portfolio
              </h1>
              <p className="text-[#1E4636]/70">
                Showcase your wedding work
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-[#1E4636] text-[#E2B451] rounded-lg font-semibold hover:bg-[#1E4636]/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add project
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-[#E2B451]/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-[#E2B451] text-lg mb-4">No projects yet</p>
            <p className="text-[#E2B451]/70 mb-6">
              Add your first wedding project to showcase your work
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90"
            >
              Add project
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 overflow-hidden hover:border-[#E2B451]/40 transition-colors"
              >
                {/* Image Gallery */}
                <div className="grid grid-cols-3 gap-1 bg-[#1E4636]/20">
                  {project.images.map((img, idx) => (
                    <div key={idx} className="aspect-square relative">
                      <img
                        src={img}
                        alt={`${project.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-[#E2B451] mb-2">
                    {project.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-3 text-[#E2B451]/70 text-sm">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(project.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      {project.location}
                    </span>
                  </div>

                  <p className="text-[#E2B451]/80 mb-4">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[#1E4636]/20 text-[#E2B451] text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-[#1E4636] border-4 border-[#E2B451] rounded-lg max-w-2xl w-full p-8 my-8">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-6">Add new project</h2>
            
            <form onSubmit={handleAddProject} className="space-y-6">
              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Project title
                </label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  placeholder="e.g., Priya & Raj Wedding"
                  required
                  className="w-full px-4 py-3 bg-[#E2B451]/10 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newProject.date}
                    onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-[#E2B451]/10 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451]"
                  />
                </div>
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newProject.location}
                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                    placeholder="e.g., Jaipur"
                    required
                    className="w-full px-4 py-3 bg-[#E2B451]/10 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Describe the wedding and your work"
                  rows={3}
                  required
                  className="w-full px-4 py-3 bg-[#E2B451]/10 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Tags
                </label>
                <div className="space-y-3">
                  {newProject.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateTag(index, e.target.value)}
                        placeholder="e.g., Royal"
                        className="flex-1 px-4 py-3 bg-[#E2B451]/10 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50"
                      />
                      {newProject.tags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="px-4 py-3 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-[#E2B451]/20 text-[#E2B451] rounded-lg hover:bg-[#E2B451]/30 font-semibold"
                  >
                    + Add tag
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-4 bg-[#E2B451]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#E2B451]/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90"
                >
                  Add project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
