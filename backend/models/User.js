import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },

  // Personal Info
  dateOfBirth: { type: String, default: "" },
  phone: { type: String, default: "" },
  city: { type: String, default: "" },
  country: { type: String, default: "" },

  // Academic
  educationLevel: { type: String, default: "Bachelors" },
  fieldOfStudy: { type: String, default: "" },
  institution: { type: String, default: "" },
  graduationYear: { type: String, default: "" },
  cgpa: { type: String, default: "" },
  cgpaOutOf: { type: String, default: "" },

  // Test Scores
  ielts: { type: String, default: "" },
  toefl: { type: String, default: "" },
  greTotal: { type: String, default: "" },
  gmat: { type: String, default: "" },
  greVerbal: { type: String, default: "" },
  greQuant: { type: String, default: "" },
  sat: { type: String, default: "" },

  // Preferences
  preferredStudyLevel: { type: String, default: "Masters" },
  preferredCountries: { type: [String], default: [] },
  preferredPrograms: { type: String, default: "" },
  preferredIntakes: { type: [String], default: [] },

  // Financial
  budgetMin: { type: String, default: "" },
  budgetMax: { type: String, default: "" },
  needFinancialAid: { type: Boolean, default: false },
  interestedInScholarships: { type: Boolean, default: false },

  // Additional
  workExperience: { type: String, default: "" },
  publications: { type: String, default: "" },
  hasResearchExperience: { type: Boolean, default: false },
  extracurriculars: { type: String, default: "" },
  careerGoals: { type: String, default: "" },
});

export default mongoose.model("User", userSchema);