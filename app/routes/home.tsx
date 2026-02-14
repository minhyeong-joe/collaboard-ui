import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext";
import './home.css';
import socket, { joinRoom, createRoom } from "../services/io";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Collaboard" },
    { name: "description", content: "Welcome to Collaboard!" },
  ];
}

export default function Home() {
  const { userId, nickname, setNickname, markVisited, isFirstVisit } = useUser();
  const [roomId, setRoomId] = useState("");
  const [errors, setErrors] = useState<{ nickname?: string; roomId?: string }>({});
  const [isSocketReady, setIsSocketReady] = useState(isFirstVisit ? false : socket.connected);
  const shouldAnimate = isFirstVisit;
  const navigate = useNavigate();

  useEffect(() => {
    markVisited();
  }, []);

  useEffect(() => {
    const handleConnect = () => setIsSocketReady(true);
    const handleDisconnect = () => setIsSocketReady(false);

    // Only listen to socket events if not already connected or first visit
    if (isFirstVisit || !socket.connected) {
      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
    }

    // Trigger connection check on mount
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [isFirstVisit]);

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

    const newRoomId = Math.random().toString(36).substring(2, 8); // generate random 6 character room ID
    createRoom(newRoomId, userId, nickname, (data) => {
      navigate(`/${newRoomId}`, { state: { roomInfo: data } });
    });
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

    joinRoom(roomId, userId, nickname, (response) => {
      if (response.success) {
        navigate(`/${roomId}`, { state: { roomInfo: response.data } });
      } else {
        setErrors(prev => ({ ...prev, roomId: response.error }));
      }
    });
  }

  return (
    <main className="w-full bg-cyan-400 font-bold h-screen overflow-y-auto">
      <div className="min-h-screen flex flex-col items-center justify-center py-8 relative">
        <h1 className={`title text-white text-center text-4xl sm:text-5xl whitespace-nowrap ${shouldAnimate && isSocketReady ? "animate" : shouldAnimate ? "wait" : ""}`}>
          Collaboard
        </h1>
        {shouldAnimate && !isSocketReady && (
          <div className="mt-4 text-white/80 text-sm">Connecting...</div>
        )}
        {isSocketReady && (
        <div className={`main-contents mx-auto text-md text-white w-full max-w-md px-4 mt-20 ${shouldAnimate ? "animate" : ""}`}>

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
        )}
      </div>
    </main>
  );
}
