import { Link, Route, Routes, useLocation } from "react-router-dom";
import Register from "./pages/Register";
import Family from "./pages/Family";

function TopBar() {
  const loc = useLocation();
  return (
    <div className="container" style={{ paddingBottom: 0 }}>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>🥪 קופסת אוכל</div>
        <div className="row" style={{ gap: 10 }}>
          <Link to="/register" style={{ textDecoration: "none" }}>
            <button className={"btn" + (loc.pathname.startsWith("/register") ? "" : " secondary")}>
              הרשמה
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopBar />
      <div className="container" style={{ paddingTop: 10 }}>
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/register" element={<Register />} />
          <Route path="/f/:token" element={<Family />} />
        </Routes>
      </div>
    </>
  );
}
