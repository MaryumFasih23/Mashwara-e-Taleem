import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/document-analyzer`;

export const analyzeDocument = async ({
  file,
  university,
  program,
}) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("university", university);
  formData.append("program", program);

  const res = await axios.post(
    `${API_URL}/analyze`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
};