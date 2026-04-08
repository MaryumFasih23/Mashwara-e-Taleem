import React, { createContext, useEffect, useState, useCallback, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebaseConfig";
import { getUniversityRecommendations } from "./api/universityapi";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [universities, setUniversities] = useState([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(false);
  const [universitiesError, setUniversitiesError] = useState("");

  // Program cache with size limit (stores last 10 universities' programs)
  const programCacheRef = useRef(new Map());
  const MAX_CACHED_PROGRAMS = 10;

  // Function to fetch universities in background
  const fetchUniversitiesBackground = useCallback(async (uid) => {
    if (!uid) return;

    setUniversitiesLoading(true);
    setUniversitiesError("");

    try {
      const data = await getUniversityRecommendations(uid, {
        minProb: 0.1,
        topK: 5000,
      });
      setUniversities(data.results || []);
    } catch (err) {
      const apiMessage = err?.response?.data?.error;
      const apiDetail = err?.response?.data?.detail;
      setUniversitiesError(
        apiDetail ? `${apiMessage}: ${apiDetail}` : apiMessage || "Failed to fetch universities."
      );
    } finally {
      setUniversitiesLoading(false);
    }
  }, []);

  // Get cached programs or return null if not cached
  const getCachedPrograms = useCallback((cacheKey) => {
    return programCacheRef.current.get(cacheKey) || null;
  }, []);

  // Cache programs with LRU eviction when cache is full
  const setProgramsCache = useCallback((cacheKey, programsData) => {
    // If cache is full, remove the oldest entry
    if (programCacheRef.current.size >= MAX_CACHED_PROGRAMS) {
      const oldestKey = programCacheRef.current.keys().next().value;
      programCacheRef.current.delete(oldestKey);
    }
    programCacheRef.current.set(cacheKey, programsData);
  }, []);

  // Clear program cache (called when profile is updated)
  const clearProgramsCache = useCallback(() => {
    programCacheRef.current.clear();
  }, []);

  // Refetch universities (called when profile changes)
  const refetchUniversities = useCallback(() => {
    if (user?.uid) {
      // Clear cached programs since eligibility may have changed
      clearProgramsCache();
      fetchUniversitiesBackground(user.uid);
    }
  }, [user?.uid, fetchUniversitiesBackground, clearProgramsCache]);

  // Initial auth state and background university fetch
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      
      // Fetch universities when user logs in
      if (firebaseUser?.uid) {
        fetchUniversitiesBackground(firebaseUser.uid);
      } else {
        // Clear data on logout
        setUniversities([]);
        setUniversitiesError("");
        clearProgramsCache();
      }

      setLoading(false);
    });

    return () => unsub();
  }, [fetchUniversitiesBackground, clearProgramsCache]);

  const value = {
    user,
    loading,
    universities,
    universitiesLoading,
    universitiesError,
    refetchUniversities,
    getCachedPrograms,
    setProgramsCache,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
