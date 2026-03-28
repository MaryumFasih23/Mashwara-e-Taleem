import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

// Save user info after Firebase signup
export const createUserProfile = async (userData) => {
  try {
    const res = await axios.post(`${API_URL}/create-user`, userData);
    return res.data;
  } catch (err) {
    console.error("Error in createUserProfile:", err);
    throw err;
  }
};
