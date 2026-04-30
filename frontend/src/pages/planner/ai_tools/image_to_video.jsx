
import React, { useRef, useState } from "react";

const ImageToVideo = () => {
	const fileInputRef = useRef(null);
	const [selectedImage, setSelectedImage] = useState(null);
	const [imagePreview, setImagePreview] = useState(null);

	const handleImageUpload = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) return;
		setSelectedImage(file);
		const reader = new FileReader();
		reader.onload = (ev) => setImagePreview(ev.target.result);
		reader.readAsDataURL(file);
	};

	const clear = () => {
		setSelectedImage(null);
		setImagePreview(null);
	};

	return (
		<div className="min-h-screen bg-black text-white font-['Poppins'] p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				<h1 className="text-3xl font-bold">Image → Video Converter</h1>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-white/5 border border-white/10 rounded-2xl p-4">
						<h2 className="text-xl font-semibold mb-3">Upload Image</h2>
						<div
							className={`border-2 rounded-xl p-6 text-center cursor-pointer ${imagePreview ? 'bg-yellow-500/5 border-yellow-500' : 'bg-white/5 hover:border-yellow-400'}`}
							onClick={() => fileInputRef.current?.click()}
						>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleImageUpload}
							/>

							{imagePreview ? (
								<img src={imagePreview} alt="Selected" className="w-full h-64 object-contain rounded-lg mx-auto" />
							) : (
								<div>
									<img src="/images/image_to_video.jpeg" alt="Mandap placeholder" className="w-full h-64 object-cover rounded-lg mb-3" />
									<p className="text-gray-300">Click to upload your image or drop it here</p>
								</div>
							)}
						</div>

						<div className="mt-4 flex gap-3">
							<button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-semibold">Choose Image</button>
							<button onClick={clear} className="px-4 py-2 bg-white/5 rounded-lg">Clear</button>
						</div>
					</div>

					<div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
						<h2 className="text-xl font-semibold mb-3">Preview / Output</h2>

						<div className="flex-1 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 p-2">
							{imagePreview ? (
								<div className="w-full h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center">
									<img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
								</div>
							) : (
								<div className="w-full h-64 rounded-lg overflow-hidden flex items-center justify-center">
									<video className="w-full h-full object-cover" autoPlay loop muted playsInline>
										<source src="/images/mandap.mp4" type="video/mp4" />
										<img src="/images/image_to_video.jpeg" alt="Mandap fallback" className="w-full h-full object-cover" />
									</video>
								</div>
							)}
						</div>

						<p className="text-sm text-gray-400 mt-3">When there's no image selected the mandap video/image is shown.</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ImageToVideo;
