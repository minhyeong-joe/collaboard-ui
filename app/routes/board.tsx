import type { Route } from "./+types/board";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext";
import Canvas, { type Stroke } from "../components/Canvas";

export function meta({ params }: Route.MetaArgs) {
    return [
        { title: `Collaboard - Room ${params.roomId}` },
        { name: "description", content: "Collaborative whiteboard" },
    ];
}

export default function Board({ params }: Route.ComponentProps) {
    const [isRoomIdVisible, setIsRoomIdVisible] = useState(false);
    const [copyMessage, setCopyMessage] = useState("");
    const [ownerName, setOwnerName] = useState<string>("");
    const navigate = useNavigate();
    const { userId, nickname } = useUser();
    
    // Redirect to home if no userId or nickname
    useEffect(() => {
        if (!userId || !nickname) {
            navigate("/");
        }
    }, [userId, nickname, navigate]);

    // TODO: Fetch board owner info from socket/server
    useEffect(() => {
        setOwnerName(nickname);
    }, [params.roomId, nickname]);

    const toggleRoomIdVisibility = () => {
        setIsRoomIdVisible(!isRoomIdVisible);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(params.roomId);
            setCopyMessage("Copied!");
            setTimeout(() => setCopyMessage(""), 2000);
        } catch (err) {
            setCopyMessage("Failed to copy");
            setTimeout(() => setCopyMessage(""), 2000);
        }
    };

    // Handler for when a stroke is completed - will emit to socket
    const handleStrokeComplete = (stroke: Stroke) => {
        console.log('Stroke completed:', stroke);
        // TODO: Emit to socket.io
        // socket.emit('draw', { roomId: params.roomId, stroke });
    };

    const handleLeaveBoard = () => {
        navigate("/");
    };

    return (
        <div className="flex flex-col h-screen">
            <header className="w-full px-4 py-2 bg-cyan-400 shadow-md flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">{ownerName ? `${ownerName}'s Board` : 'Board'}</h1>
                <div className="flex items-center gap-4">
                    {copyMessage && <span className="text-sm text-white font-semibold bg-white/20 px-2 py-1 rounded">{copyMessage}</span>}
                    <p className="text-sm text-white/90">Room ID: {isRoomIdVisible ? params.roomId : "******"}</p>
                    {isRoomIdVisible ? (
                        <button onClick={toggleRoomIdVisibility} className="text-white/80 hover:text-white transition-colors cursor-pointer">
                            <i className="fa fa-eye" aria-hidden="true"></i>
                        </button>
                    ) : (
                        <button onClick={toggleRoomIdVisibility} className="text-white/80 hover:text-white transition-colors cursor-pointer">
                            <i className="fa fa-eye-slash" aria-hidden="true"></i>
                        </button>
                    )}
                    <button onClick={copyToClipboard} className="text-white/80 hover:text-white transition-colors cursor-pointer">
                        <i className="fa fa-copy" aria-hidden="true"></i>
                    </button>
                    <button onClick={handleLeaveBoard} className="ml-4 text-red-400 text-3xl font-bold rounded transition-colors cursor-pointer">
                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    </button>
                </div>
            </header>
            
            <div className="flex-1 overflow-hidden">
                <Canvas
                    userId={userId}
                    userName={nickname}
                    roomId={params.roomId}
                    onStrokeComplete={handleStrokeComplete}
                />
            </div>
        </div>
    );
}
