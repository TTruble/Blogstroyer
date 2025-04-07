import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import DestructionPage from "./pages/DestructionPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import LeaderboardPage from "./pages/LeaderboardPage";
import ForgotPassword from "./components/ForgotPassword";
import ShopPage from "./pages/ShopPage";
import MyProfilePage from "./pages/MyProfilePage";
import ProfilePage from "./pages/ProfilePage";
import InventoryPage from "./pages/InventoryPage";
import "./components/GlobalTheme.scss";

const ThemeApplier = () => {
  const location = useLocation();

  useEffect(() => {
    const theme = localStorage.getItem("blogstroyer-theme");
    if (theme) {
      try {
        const themeData = JSON.parse(theme);
        document.documentElement.style.setProperty(
          "--background-color",
          themeData.backgroundColor
        );
        document.documentElement.style.setProperty(
          "--text-color",
          themeData.textColor
        );
        document.documentElement.style.setProperty(
          "--accent-color",
          themeData.accentColor
        );
      } catch (e) {
        console.error("Error applying theme:", e);
      }
    }
  }, [location]);

  return null;
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("blogstroyer-theme");
    if (savedTheme) {
      try {
        const themeData = JSON.parse(savedTheme);

        const lightenColor = (color, percent) => {
          let r, g, b;
          if (color.startsWith("#")) {
            const hex = color.substring(1);
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
          } else if (color.startsWith("rgb")) {
            const rgbValues = color.match(/\d+/g);
            if (rgbValues && rgbValues.length >= 3) {
              r = parseInt(rgbValues[0]);
              g = parseInt(rgbValues[1]);
              b = parseInt(rgbValues[2]);
            } else {
              return color;
            }
          } else {
            return color;
          }

          r = Math.min(255, Math.floor(r * (1 + percent / 100)));
          g = Math.min(255, Math.floor(g * (1 + percent / 100)));
          b = Math.min(255, Math.floor(b * (1 + percent / 100)));

          return `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        };

        const cardBackground =
          themeData.cardBackground ||
          lightenColor(themeData.backgroundColor, 15);
        const cardHoverBackground = lightenColor(cardBackground, 10);

        document.documentElement.style.setProperty(
          "--background-color",
          themeData.backgroundColor
        );
        document.documentElement.style.setProperty(
          "--text-color",
          themeData.textColor
        );
        document.documentElement.style.setProperty(
          "--accent-color",
          themeData.accentColor
        );

        document.documentElement.style.setProperty(
          "--card-background",
          cardBackground
        );
        document.documentElement.style.setProperty(
          "--card-hover-background",
          cardHoverBackground
        );
        document.documentElement.style.setProperty(
          "--card-border",
          themeData.cardBorder || "rgba(255, 255, 255, 0.1)"
        );
        document.documentElement.style.setProperty(
          "--header-background",
          themeData.headerBackground || "rgba(0, 0, 0, 0.3)"
        );
        document.documentElement.style.setProperty(
          "--leaderboard-background",
          themeData.leaderboardBackground || cardBackground
        );
        document.documentElement.style.setProperty(
          "--leaderboard-header",
          themeData.leaderboardHeader || themeData.backgroundColor
        );

        document.body.style.backgroundColor = themeData.backgroundColor;
        document.body.style.color = themeData.textColor;
      } catch (e) {
        console.error("Error loading theme:", e);
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <ThemeApplier />
      <div className="theme-enabled">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/post/:postId" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/destroy" element={<DestructionPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/my-profile" element={<MyProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
