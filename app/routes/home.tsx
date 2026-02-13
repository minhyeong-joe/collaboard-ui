import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext";
import './home.css';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Collaboard" },
    { name: "description", content: "Welcome to Collaboard!" },
  ];
}

export default function Home() {
  const { nickname, setNickname, markVisited, isFirstVisit } = useUser();
  const [roomId, setRoomId] = useState("");
  const [errors, setErrors] = useState<{ nickname?: string; roomId?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    markVisited();
  }, []);

  useEffect(() => {
    setNickname(nickname);
  }, [nickname]);

  useEffect(() => {
    if (errors.nickname && nickname.trim()) {
      setErrors(prev => ({ ...prev, nickname: undefined }));
    }
  }, [nickname, errors.nickname]);

  useEffect(() => {
    if (roomId.trim()) {
      setErrors(prev => ({ ...prev, roomId: undefined }));
    }
  }, [roomId]);

  const createNewBoard = () => {
    if (!nickname.trim()) {
      setErrors(prev => ({ ...prev, nickname: "Please enter a nickname before creating a board." }));
      return;
    }
    setNickname(nickname.trim());

    // TODO: create new socket room and navigate to board with room ID
    navigate("/test");
  }

  const joinBoard = () => {
    if (!nickname.trim()) {
      setErrors(prev => ({ ...prev, nickname: "Please enter a nickname before joining a board." }));
      return;
    }

    if (!roomId.trim()) {
      setErrors(prev => ({ ...prev, roomId: "Please enter a board code to join." }));
      return;
    }
    setNickname(nickname.trim());

    // TODO: check if socket id exists and navigate to board if valid
    // otherwise set error
    // simulate invalid room id
    if (roomId.trim() === "invalid") {
      setErrors(prev => ({ ...prev, roomId: "Board not found. Please check the code and try again." }));
      return;
    }
    navigate(`/${roomId}`);
  }

  return (
    <main className="w-full bg-cyan-400 font-bold h-screen overflow-y-auto">
      <div className="min-h-screen flex flex-col items-center justify-center py-8 relative">
        <h1 className={`title text-white text-center text-4xl sm:text-5xl whitespace-nowrap ${!isFirstVisit ? "no-animation" : ""}`}>
          Collaboard
        </h1>
        <div className={`main-contents mx-auto text-md text-white w-full max-w-md px-4 mt-20 ${!isFirstVisit ? "no-animation" : ""}`}>

          <div className="section-card bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="step-badge bg-white text-cyan-400 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              <h2 className="text-xl font-bold">Enter your nickname</h2>
            </div>
            <div className="form-group">
              <label className="block mb-2 text-sm">Nickname</label>
              <input
                type="text"
                className="w-full border border-white/50 bg-transparent rounded px-4 py-3 text-white placeholder-white/60"
                placeholder="Your name..."
                value={nickname}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 12) {
                    setNickname(value);
                  }
                }}
              />
              {errors.nickname && <p className="mt-2 text-sm text-red-400 font-light">{errors.nickname}</p>}
            </div>
          </div>

          <div className="section-card bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 shadow-lg mt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="step-badge bg-white text-cyan-400 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              <h2 className="text-xl font-bold">Choose an option</h2>
            </div>

            <button className="w-full bg-white text-cyan-400 font-bold py-3 px-6 rounded hover:bg-white/90 transition-colors cursor-pointer" onClick={createNewBoard}>
              Create New Board
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-cyan-400 text-white/80">OR</span>
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="block mb-2 text-sm">Board Code</label>
              <input
                type="text"
                className="w-full border border-white/50 bg-transparent rounded px-4 py-3 text-white placeholder-white/60"
                placeholder="Enter code..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              {errors.roomId && <p className="mt-2 text-sm text-red-400 font-light">{errors.roomId}</p>}
            </div>
            <button className="w-full bg-white text-cyan-400 font-bold py-3 px-6 rounded hover:bg-white/90 transition-colors cursor-pointer" onClick={joinBoard}>
              Join Board
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
