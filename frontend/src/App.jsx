  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import HomePage from "./pages/HomePage";
  import DestructionPage from "./pages/DestructionPage";
  import Login from "./pages/Login";
  import Register from "./pages/Register";
  import Header from "./components/Header";
  import ProtectedRoute from "./components/ProtectedRoute";
  import LeaderboardPage from "./pages/LeaderboardPage";
  import ForgotPassword from "./components/ForgotPassword";



  function App() {
    return (
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/destroy" element={<DestructionPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  export default App;
