import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

// Save user info after Firebase signup
export const createUserProfile = async (userData) => {
  try {
    const res = await axios.post(`${API_URL}/create`, userData);
    return res.data;
  } catch (err) {
    console.error("Error in createUserProfile:", err);
    throw err;
  }
};

// Get full profile by Firebase UID
export const getUserProfile = async (uid) => {
  try {
    const res = await axios.get(`${API_URL}/profile/${uid}`);
    return res.data;
  } catch (err) {
    console.error("Error in getUserProfile:", err);
    throw err;
  }
};

// Update full profile by Firebase UID
export const updateUserProfile = async (uid, profileData) => {
  try {
    const res = await axios.put(`${API_URL}/profile/${uid}`, profileData);
    return res.data;
  } catch (err) {
    console.error("Error in updateUserProfile:", err);
    throw err;
  }
};