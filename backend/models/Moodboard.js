import mongoose from "mongoose";

const moodboardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    boardId: { type: String, required: true, index: true }, // client-side ID like "haldi_123456789"
    theme: { type: String, required: true, index: true }, // "haldi", "mehendi", "sangeet", "wedding"
    title: { type: String },
    style: { type: String },
    functionType: { type: String },
    prompt: { type: String },
    images: [
      {
        id: { type: String },
        url: { type: String, required: true },
        label: { type: String },
        source: { type: String },
        publicId: { type: String },
        editMeta: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model("Moodboard", moodboardSchema);
