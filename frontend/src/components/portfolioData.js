export const projectsData = [
  {
    "id": "project-1",
    "title": "Project 1",
    "location": "",
    "cover": "/projects/p1.png",
    "sections": [
      {
        "label": "Brief from Planners",
        "caption": "Input given by planners",
        "images": [
          "slide03_1.jpg",
          "slide04_1.jpg",
          "slide05_1.jpg",
          "slide05_2.jpg",
          "slide06_1.jpg",
          "slide06_2.jpg"
        ]
      },
      {
        "label": "Concept & Process",
        "caption": "",
        "images": [
          "slide07_1.jpg",
          "slide07_2.jpg",
          "slide08_1.jpg",
          "slide08_2.jpg",
          "slide08_3.jpg",
          "slide09_1.jpg"
        ]
      },
      {
        "label": "Final Feedback",
        "caption": "Final feedback",
        "images": [
          "slide10_1.jpg"
        ]
      }
    ]
  },
  {
    "id": "project-2",
    "title": "Project 2 — Shakuntala Farms",
    "location": "Shakuntala Farms",
    "cover": "/projects/p2.png",
    "sections": [
      {
        "label": "Overview",
        "caption": "Project 2 - shakuntala farms",
        "images": [
          "slide12_1.jpg",
          "slide12_2.jpg",
          "slide12_3.jpg"
        ]
      },
      {
        "label": "References",
        "caption": "References",
        "images": [
          "slide13_1.jpg",
          "slide13_2.jpg",
          "slide13_3.jpg",
          "slide13_4.jpg",
          "slide13_5.jpg",
          "slide13_6.jpg",
          "slide13_7.jpg"
        ]
      },
      {
        "label": "Our Submission Moodboard",
        "caption": "Our submission moodboard",
        "images": [
          "slide14_1.jpg",
          "slide14_2.jpg",
          "slide14_3.jpg",
          "slide14_4.jpg",
          "slide14_5.jpg",
          "slide14_6.jpg"
        ]
      },
      {
        "label": "Final Feedback",
        "caption": "Final Feedback",
        "images": [
          "slide15_1_blurred.jpg",
          "slide15_2_blurred.jpg",
          "slide15_3_blurred.jpg"
        ]
      }
    ]
  },
  {
    "id": "project-3",
    "title": "Project 3 — Welcome Board & Props",
    "location": "",
    "cover": "/projects/p3.png",
    "sections": [
      {
        "label": "Welcome Board and Props",
        "caption": "Welcome board and props",
        "images": [
          "slide17_1.jpg",
          "slide17_10.jpg",
          "slide17_11.jpg",
          "slide17_2.jpg",
          "slide17_3.jpg",
          "slide17_4.jpg",
          "slide17_5.jpg",
          "slide17_6.jpg",
          "slide17_7.jpg",
          "slide17_8.jpg",
          "slide17_9.jpg",
          "slide18_1.jpg",
          "slide18_2.jpg",
          "slide18_3.jpg"
        ]
      },
      {
        "label": "Plan & Our Submission",
        "caption": "Plan / Our submission",
        "images": [
          "slide19_1.jpg",
          "slide19_2.jpg",
          "slide19_3.jpg",
          "slide19_4.jpg"
        ]
      },
      {
        "label": "Our Submission",
        "caption": "Our submission",
        "images": [
          "slide20_1.jpg",
          "slide20_2.jpg",
          "slide20_3.jpg",
          "slide20_4.jpg",
          "slide20_5.jpg",
          "slide20_6.jpg",
          "slide21_1.jpg",
          "slide21_2.jpg",
          "slide21_3.jpg",
          "slide21_4.jpg"
        ]
      }
    ]
  },
  {
    "id": "project-4",
    "title": "Project 4",
    "location": "",
    "cover": "/projects/p4.jpg",
    "sections": [
      {
        "label": "Reference & Concept",
        "caption": "",
        "images": [
          "slide23_1.jpg",
          "slide23_2.jpg",
          "slide23_3.jpg",
          "slide23_4.jpg",
          "slide23_5.jpg",
          "slide24_1.jpg",
          "slide24_2.jpg",
          "slide24_3.jpg",
          "slide24_4.jpg",
          "slide24_5.jpg",
          "slide24_6.jpg"
        ]
      },
      {
        "label": "Our Submission",
        "caption": "Our submission",
        "images": [
          "slide25_1.jpg",
          "slide25_2.jpg",
          "slide25_3.jpg",
          "slide25_4.jpg",
          "slide25_5.jpg",
          "slide25_6.jpg"
        ]
      },
      {
        "label": "Final Feedback",
        "caption": "Final feedback",
        "images": [
          "slide26_1_blurred.jpg",
          "slide26_2_blurred.jpg"
        ]
      }
    ]
  }
];

// Helper to get formatted data
export const getFormattedProjects = () => {
  return projectsData.map(p => {
    const formattedSections = (p.sections || []).map(s => ({
      ...s,
      images: (s.images || []).map(img => `/uploads/${p.id}/${img}`)
    }));
    const firstImage = formattedSections[0]?.images[0] || '';
    return {
      ...p,
      cover: p.cover || firstImage,
      sections: formattedSections
    };
  });
};

// Extract all feedback images from all projects
export const getAllFeedbackImages = () => {
  const formattedProjects = getFormattedProjects();
  const allFeedbackImages = [];
  formattedProjects.forEach(project => {
    if (project && project.sections && Array.isArray(project.sections)) {
      const fb = project.sections.find(s => s && (s.label === "Final Feedback" || s.label?.toLowerCase().includes("final feedback")));
      if (fb && fb.images && Array.isArray(fb.images)) {
        allFeedbackImages.push(...fb.images);
      }
    }
  });
  return allFeedbackImages;
};
