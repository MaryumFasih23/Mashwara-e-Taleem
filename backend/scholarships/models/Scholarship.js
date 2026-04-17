const mongoose = require("mongoose");

const CACHE_SCHEMA_VERSION = 12;

const scholarshipItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    provider: { type: String, default: "Unknown" },
    country: { type: String, default: "Any" },
    domain: { type: String, default: "Any" },
    degreeLevel: { type: String, default: "Any" },
    amount: { type: String, default: "Unknown" },
    deadline: { type: String, default: "Unknown" },
    eligibility: { type: [String], default: ["Unknown"] },
    benefits: { type: [String], default: ["Unknown"] },
    applicationLink: { type: String, default: "" },
    isGovernment: { type: Boolean, default: false },
    type: { type: String, default: "Private" },
    description: { type: String, default: "" },
    source: { type: String, default: "" },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const scholarshipCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    cacheVersion: {
      type: Number,
      default: CACHE_SCHEMA_VERSION,
      index: true,
    },
    scholarships: {
      type: [scholarshipItemSchema],
      required: true,
      default: [],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.every((item) => item && typeof item === "object" && !Array.isArray(item))
          );
        },
        message: "Scholarships must be an array of objects.",
      },
    },
    irrelevantSources: {
      type: [
        new mongoose.Schema(
          {
            title: { type: String, default: "" },
            applicationLink: { type: String, default: "" },
            description: { type: String, default: "" },
            source: { type: String, default: "" },
            reason: { type: String, default: "Irrelevant source" },
          },
          { _id: false }
        ),
      ],
      default: [],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.every((item) => item && typeof item === "object" && !Array.isArray(item))
          );
        },
        message: "Irrelevant sources must be an array of objects.",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 15,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Scholarship", scholarshipCacheSchema);
module.exports.CACHE_SCHEMA_VERSION = CACHE_SCHEMA_VERSION;
