import axios from "axios";

const API_URL = "http://localhost:5000/api/universities";

export const getUniversityRecommendations = async (uid, options = {}) => {
  const minProb = options.minProb ?? 0.1;
  const topK = options.topK ?? 20;

  const res = await axios.get(`${API_URL}/recommendations/${uid}`, {
    params: { minProb, topK },
  });

  return res.data;
};
