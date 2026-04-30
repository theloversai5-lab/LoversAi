// utils/cloudinary.js — Cloudinary configuration and upload utility
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import multerStorageCloudinary from "multer-storage-cloudinary";

// Support both CJS and ESM shapes for multer-storage-cloudinary
const CloudinaryStorage =
  multerStorageCloudinary?.CloudinaryStorage ||
  (multerStorageCloudinary?.default &&
    multerStorageCloudinary.default.CloudinaryStorage) ||
  multerStorageCloudinary?.default ||
  multerStorageCloudinary;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage engine for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine folder based on file type or route
    let folder = "loversai/misc";
    if (req.uploadFolder) {
      folder = `loversai/${req.uploadFolder}`;
    } else if (file.fieldname === "avatar") {
      folder = "loversai/avatars";
    } else if (file.fieldname === "portfolio") {
      folder = "loversai/portfolios";
    } else if (file.fieldname === "moodboard") {
      folder = "loversai/moodboards";
    }

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto" },
      ],
    };
  },
});

// File filter — only images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WebP, and GIF images are allowed"), false);
  }
};

// Multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10, // Max 10 files at once
  },
});

// Direct upload from base64/buffer (for server-side uploads)
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || "loversai/misc",
      resource_type: "image",
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto" },
      ],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

// Delete from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

export default cloudinary;
