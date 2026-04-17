const express = require("express");
const router = express.Router();
const {
  clearAllCache,
  clearCache,
  getScholarships,
} = require("../controllers/scholarshipController");

// GET /api/scholarships?country=UK&domain=Computer+Science&degreeLevel=Master
router.get("/", getScholarships);

// DELETE /api/scholarships/cache/:cacheKey
router.delete("/cache/:cacheKey", clearCache);

// DELETE /api/scholarships/cache
router.delete("/cache", clearAllCache);

module.exports = router;
