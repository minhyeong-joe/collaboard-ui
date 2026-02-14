import type { Route } from "./+types/board";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "react-hot-toast";

import { useUser } from "../contexts/UserContext";
import Canvas, { type Stroke } from "../components/Canvas";
import { completeStroke, leaveRoom, listenForStrokes, listenForUserJoined, listenForUserLeft, cleanupListeners, listenForRoomDeleted } from "../services/io";

export function meta({ params }: Route.MetaArgs) {
    return [
        { title: `Collaboard - Room ${params.roomId}` },
        { name: "description", content: "Collaborative whiteboard" },
    ];
}

export default function Board({ params }: Route.ComponentProps) {
    const [isRoomIdVisible, setIsRoomIdVisible] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [ownerName, setOwnerName] = useState<string>("");
    const { userId, nickname } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const roomInfo = location.state?.roomInfo;

    useEffect(() => {
        if (!roomInfo) return;
        
        setParticipants(roomInfo.users);
        setOwnerName(roomInfo.owner);
        
        listenForUserJoined((data) => {
            console.log('User joined:', data);
            setParticipants(prev => [...prev, data]);
            toast.success(`${data.nickname} joined the room`);
        });

        listenForUserLeft((data) => {
            console.log('User left:', data);
            setParticipants(prev => prev.filter(u => u.userId !== data.userId));
            toast.error(`${data.nickname} left the room`);
        });
        
        // if owner leaves, room is deleted, kick out all users
        listenForRoomDeleted((data) => {
            console.log('Room deleted:', data);
            toast.error("Owner has left. Room is closed.");
            navigate("/");
        });

        return () => {
            cleanupListeners();
        }
    }, [roomInfo])

    // FOR DEBUGGING
    useEffect(() => {
        console.log("participants updated:", participants);
    }, [participants]); 

    // Redirect to home if no userId or nickname
    useEffect(() => {
        if (!userId || !nickname) {
            navigate("/");
        }
    }, [userId, nickname, navigate]);

    const toggleRoomIdVisibility = () => {
        setIsRoomIdVisible(!isRoomIdVisible);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(params.roomId);
            toast.success("Room ID copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy Room ID");
        }
    };

    // Handler for when a stroke is completed - will emit to socket
    const handleStrokeComplete = (stroke: Stroke) => {
        console.log('Stroke completed:', stroke);
    };

    const handleLeaveBoard = () => {
        leaveRoom(params.roomId, userId);
        navigate("/");
    };

    return (
        <div className="flex flex-col h-screen">
            <header className="w-full px-4 py-2 bg-cyan-400 shadow-md flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">{ownerName ? `${ownerName}'s Board` : 'Board'}</h1>
                <div className="flex items-center gap-4">
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
                    participants={participants}
                />
            </div>
        </div>
    );
}
