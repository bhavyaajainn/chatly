import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Chat from "./pages/Chat";
import ErrorBoundary from "./components/ErrorBoundary"; // Ensure this is created
import { auth, db } from "./config/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

function App() {
  return (
    <div>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </div>
  );
}

export default App;
