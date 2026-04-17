// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {

  apiKey: "AIzaSyC0DZVL6iHc-5dodCeYR5U-JYGFfu0YNJc",
  authDomain: "mashawar-e-taleem.firebaseapp.com",
  projectId: "mashawar-e-taleem",
  storageBucket: "mashawar-e-taleem.appspot.com",
  messagingSenderId: "935120278765",
  appId: "1:935120278765:web:786614cff0c7e734c928e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export { app };