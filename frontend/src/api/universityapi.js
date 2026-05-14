import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/universities`;

export const getUniversityRecommendations = async (uid, options = {}) => {
  const minProb = options.minProb ?? 0.1;
  const topK = options.topK ?? 20;

  const res = await axios.get(`${API_URL}/recommendations/${uid}`, {
    params: { minProb, topK },
  });

  return res.data;
};

export const getUniversityProgramEligibility = async (
  uid,
  options = {}
) => {
  const university = options.university ?? "";
  const country = options.country ?? "";
  const topK = options.topK ?? 50;

  const res = await axios.get(`${API_URL}/programs/${uid}`, {
    params: { university, country, topK },
  });

  return res.data;
};