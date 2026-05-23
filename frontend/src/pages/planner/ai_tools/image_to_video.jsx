import React, { useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";

const ImageToVideo = ({ onClose }) => {
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Interactive Motion States
  const [dynamicMovement, setDynamicMovement] = useState(40);
  const [focusEffect, setFocusEffect] = useState(20);
  
  // Theme state: defaults to dark page backdrop
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      toast.success("Image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop a valid image file");
      return;
    }
    
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      toast.success("Image dropped successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const clear = () => {
    setSelectedImage(null);
    setImagePreview(null);
    toast.success("Cleared selection");
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1c1c1e",
            color: "#fff",
            fontSize: "14px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#3b82f6",
              secondary: "#000",
            },
          },
        }}
      />

      <div className={`min-h-screen ${isDarkTheme ? "bg-[#0e0e10]" : "bg-gray-150"} text-white font-['Poppins'] relative overflow-hidden py-12 px-4 md:px-8 lg:px-16 transition-colors duration-500`}>
        {/* Modern ambient glassmorphic glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>

        {/* Top Header Section */}
        <header className="max-w-[1400px] mx-auto mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Back Button + Title */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="hover:opacity-75 transition-opacity text-2xl font-light text-white cursor-pointer"
                    title="Go Back"
                  >
                    ←
                  </button>
                )}
                <h1 className="text-3xl md:text-[36px] font-bold text-white tracking-tight">
                  Image to Video Generator
                </h1>
              </div>
              <p className="text-gray-400 font-medium text-xs md:text-sm pl-8">
                Transform static images into dynamic videos with AI
              </p>
            </div>

            {/* Outlined Badges + Sleek Credits Pill */}
            <div className="flex flex-wrap items-center gap-2 pl-8 md:pl-0">
              <span className="border border-white/20 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/80 select-none">
                Motion Effects
              </span>
              <span className="border border-white/20 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/80 select-none">
                AI Powered
              </span>
              <span className="border border-white/20 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/80 select-none">
                HD Quality
              </span>
              
              {/* Dynamic Theme Toggle Switch */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-400 font-medium select-none">Theme:</span>
                <button 
                  onClick={() => setIsDarkTheme(!isDarkTheme)}
                  className="w-12 h-6 rounded-full bg-white/10 border border-white/20 relative transition-all duration-300 flex items-center p-0.5 cursor-pointer"
                  title="Toggle background theme"
                >
                  <div className={`w-[18px] h-[18px] rounded-full bg-blue-500 shadow-md transform transition-all duration-300 ${isDarkTheme ? 'translate-x-6 bg-blue-400' : 'translate-x-0 bg-amber-400'}`}></div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace White Card Panel */}
        <main className="max-w-[1400px] mx-auto bg-white text-black rounded-[32px] p-8 shadow-2xl mb-8">
          
          {/* Main Title inside the card */}
          <div className="text-center mb-10 select-none">
            <h2 className="text-2xl md:text-3xl font-black text-black mb-1">
              AI Video Generation Workflow
            </h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              Upload &rarr; Select Motion &rarr; Generate your dynamic video
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Upload Image (Step 1) */}
            <div className="flex flex-col h-full">
              <div className="flex flex-col items-center text-center mb-6 select-none">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-2 select-none">
                  1
                </div>
                <h3 className="text-lg font-bold text-black">Upload Image</h3>
                <p className="text-xs text-gray-500">Choose your photo</p>
              </div>

              <div className="flex-1 bg-[#F9FAFB] rounded-[24px] border border-gray-100 p-4 shadow-sm flex flex-col min-h-[360px]">
                <div
                  className={`flex-1 border border-dashed rounded-[20px] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
                    imagePreview
                      ? "border-blue-500 bg-blue-50/5"
                      : "border-gray-200 bg-white hover:border-black hover:bg-gray-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative w-full h-full min-h-[220px] rounded-[16px] overflow-hidden group">
                      <img
                        src={imagePreview}
                        alt="Uploaded preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-[16px]"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-[16px]">
                        <div className="text-center text-white">
                          <span className="text-2xl block mb-1">📷</span>
                          <p className="text-xs font-semibold">Change Image</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 select-none">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-gray-100">
                        📸
                      </div>
                      <p className="text-[15px] font-bold text-black mb-1">
                        Drop image here
                      </p>
                      <p className="text-[13px] text-gray-500 mb-4">
                        or click to browse
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold tracking-wide">
                        JPG, PNG, WebP
                      </p>
                    </div>
                  )}
                </div>

                {imagePreview && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clear();
                    }}
                    className="mt-3 text-xs text-red-500 hover:text-red-700 font-bold flex items-center justify-center gap-1 py-1.5 px-4 bg-red-50 hover:bg-red-100 rounded-xl transition-all self-center cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            {/* Column 2: Select Motion (Step 2) */}
            <div className="flex flex-col h-full">
              <div className="flex flex-col items-center text-center mb-6 select-none">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-2 select-none">
                  2
                </div>
                <h3 className="text-lg font-bold text-black">Select Motion</h3>
                <p className="text-xs text-gray-500">Choose effect type</p>
              </div>

              <div className="flex-1 bg-[#F9FAFB] rounded-[24px] border border-gray-100 p-4 shadow-sm flex flex-col justify-center gap-4 min-h-[360px]">
                
                {/* Dynamic Movement Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-lg select-none shadow-sm">
                      ↔️
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-[15px]">Dynamic Movement</h4>
                      <p className="text-[11px] text-gray-400">Control panning pace & speed</p>
                    </div>
                  </div>
                  
                  {/* Slider */}
                  <div className="flex flex-col gap-1">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={dynamicMovement}
                      onChange={(e) => setDynamicMovement(parseInt(e.target.value))}
                      className="w-full accent-black h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mt-1">
                      <span>Subtle</span>
                      <span className="text-black bg-gray-100 px-1.5 py-0.5 rounded">{dynamicMovement}%</span>
                      <span>Intense</span>
                    </div>
                  </div>
                </div>

                {/* Focus Effect Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-lg select-none shadow-sm">
                      🔍
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-[15px]">Focus Effect</h4>
                      <p className="text-[11px] text-gray-400">Intelligent zoom & depth tracking</p>
                    </div>
                  </div>
                  
                  {/* Slider */}
                  <div className="flex flex-col gap-1">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={focusEffect}
                      onChange={(e) => setFocusEffect(parseInt(e.target.value))}
                      className="w-full accent-black h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mt-1">
                      <span>Low</span>
                      <span className="text-black bg-gray-100 px-1.5 py-0.5 rounded">{focusEffect}%</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Column 3: Generate Video (Step 3) */}
            <div className="flex flex-col h-full">
              <div className="flex flex-col items-center text-center mb-6 select-none">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-2 select-none">
                  3
                </div>
                <h3 className="text-lg font-bold text-black">Generate Video</h3>
                <p className="text-xs text-gray-500">Create your result</p>
              </div>

              <div className="flex-1 bg-[#F9FAFB] rounded-[24px] border border-gray-100 p-4 shadow-sm flex flex-col justify-between min-h-[360px]">
                <div className="flex-1 border border-dashed border-gray-200 bg-white rounded-[20px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="py-12 select-none">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-gray-100">
                      🎬
                    </div>
                    <p className="text-[15px] font-bold text-black mb-1">
                      Video appears here
                    </p>
                    <p className="text-[13px] text-gray-500">
                      Upload & select motion first
                    </p>
                  </div>
                </div>

                {/* Coming Soon Button */}
                <button
                  disabled={true}
                  className="w-full mt-4 bg-gray-300 text-gray-600 rounded-[16px] py-4 font-bold flex items-center justify-center gap-2 cursor-not-allowed select-none transition-all shadow-sm"
                >
                  <span>🚧</span> Coming Soon
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
};

export default ImageToVideo;
