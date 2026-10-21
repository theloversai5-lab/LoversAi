import { useState } from "react";

export default function Dashboard() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleConvert = () => {
    // Dummy logic for illustration — replace with actual API call
    if (selectedImage) {
      setVideoUrl(selectedImage); // For now just reuse the image URL
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 via-white/20 to-gray-200 backdrop-blur-sm">
      <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-3xl shadow-2xl p-8 w-full max-w-3xl">
        <h1 className="text-3xl font-serif text-center mb-8 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
          Image to Video Converter
        </h1>

        <div className="space-y-6">
          {/* Image Upload */}
          <div className="flex flex-col items-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-gray-700 bg-white/20 border border-white/30 rounded-xl cursor-pointer p-3 hover:border-yellow-500 transition-all"
            />
          </div>

          {/* Convert Button */}
          <div className="flex justify-center">
            <button
              onClick={handleConvert}
              className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-xl shadow-md hover:shadow-lg hover:brightness-110 transition-all"
            >
              Convert to Video
            </button>
          </div>

          {/* Video Preview */}
          {videoUrl && (
            <div className="mt-6 p-4 bg-white/20 border border-white/30 rounded-2xl backdrop-blur-sm shadow-inner">
              <h2 className="text-xl font-medium text-center mb-4 text-gray-800">
                Preview
              </h2>
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl border border-white/20 shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
