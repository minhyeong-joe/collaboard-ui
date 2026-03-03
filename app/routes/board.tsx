import type { Route } from "./+types/board";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "react-hot-toast";

import { useUser } from "../contexts/UserContext";
import Canvas, { type Stroke } from "../components/Canvas";
import socket, {
	completeStroke,
	leaveRoom,
	listenForUserJoined,
	listenForUserLeft,
	cleanupListeners,
	listenForRoomDeleted,
	reconnectRoom,
	listenForUserDisconnected,
	listenForUserReconnected,
} from "../services/io";

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
	const [ownerId, setOwnerId] = useState<string>("");
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const { userId, nickname } = useUser();
	const pendingStrokeRef = useRef<Stroke | null>(null);
	const sendRafRef = useRef<number | null>(null);
	const hasJoinedRef = useRef(false);
	const navigate = useNavigate();
	const location = useLocation();
	const roomInfo = location.state?.roomInfo;

	useEffect(() => {
		const initWithData = (data: any) => {
			setParticipants(data.users);
			setOwnerName(data.owner);
			setOwnerId(data.users?.find((u: any) => u.isCreator)?.userId || "");
			setStrokes(data.strokes || []);
			hasJoinedRef.current = true;

			listenForUserJoined((data) => {
				setParticipants((prev) => [...prev, data]);
				toast.success(`${data.nickname} joined the room`);
			});

			listenForUserLeft((data) => {
				setParticipants((prev) =>
					prev.filter((u: any) => u.userId !== data.userId),
				);
				toast.error(`${data.nickname} left the room`);
			});

			listenForRoomDeleted(() => {
				toast.error("Owner has left. Room is closed.");
				navigate("/");
			});

			listenForUserDisconnected((data) => {
				toast.error(`${data.nickname} disconnected`);
			});

			listenForUserReconnected((data) => {
				toast.success(`${data.nickname} reconnected`);
			});
		};

		if (roomInfo) {
			initWithData(roomInfo);
			navigate(location.pathname, { replace: true, state: null });
		} else if (nickname) {
			reconnectRoom(params.roomId, userId, nickname, (response) => {
				if (response.success) {
					initWithData(response.data);
				} else {
					toast.error("Session expired. Please rejoin.");
					navigate("/");
				}
			});
		}

		return () => {
			cleanupListeners();
			if (sendRafRef.current !== null) {
				cancelAnimationFrame(sendRafRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const handleConnect = () => {
			if (!hasJoinedRef.current) return;
			reconnectRoom(params.roomId, userId, nickname, (response) => {
				if (response.success) {
					setParticipants(response.data.users);
					setOwnerId(
						response.data.users?.find((u: any) => u.isCreator)?.userId || "",
					);
					setStrokes(response.data.strokes || []);
					toast.success("Reconnected");
				} else {
					toast.error("Session expired. Please rejoin.");
					navigate("/");
				}
			});
		};

		socket.on("connect", handleConnect);
		return () => {
			socket.off("connect", handleConnect);
		};
	}, [params.roomId, userId, nickname]);

	useEffect(() => {
		if (!userId || !nickname) {
			navigate("/");
		}
	}, [userId, nickname, navigate]);

	const toggleRoomIdVisibility = () => setIsRoomIdVisible(!isRoomIdVisible);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(params.roomId);
			toast.success("Room ID copied to clipboard");
		} catch {
			toast.error("Failed to copy Room ID");
		}
	};

	const handleStrokeComplete = (stroke: Stroke) => {
		pendingStrokeRef.current = stroke;
		if (sendRafRef.current === null) {
			sendRafRef.current = requestAnimationFrame(() => {
				sendRafRef.current = null;
				if (pendingStrokeRef.current) {
					completeStroke(params.roomId, pendingStrokeRef.current);
				}
			});
		}
	};

	const handleLeaveBoard = () => {
		leaveRoom(params.roomId, userId);
		navigate("/");
	};

	return (
		<div className="flex flex-col h-screen">
			<header className="w-full px-4 py-2 bg-cyan-400 shadow-md flex items-center justify-between">
				<h1 className="text-xl font-bold text-white">
					{ownerName ? `${ownerName}'s Board` : "Board"}
				</h1>
				<div className="flex items-center gap-4">
					<p className="text-sm text-white/90">
						Room ID: {isRoomIdVisible ? params.roomId : "******"}
					</p>
					{isRoomIdVisible ? (
						<button
							onClick={toggleRoomIdVisibility}
							className="text-white/80 hover:text-white transition-colors cursor-pointer"
						>
							<i className="fa fa-eye" aria-hidden="true"></i>
						</button>
					) : (
						<button
							onClick={toggleRoomIdVisibility}
							className="text-white/80 hover:text-white transition-colors cursor-pointer"
						>
							<i className="fa fa-eye-slash" aria-hidden="true"></i>
						</button>
					)}
					<button
						onClick={copyToClipboard}
						className="text-white/80 hover:text-white transition-colors cursor-pointer"
					>
						<i className="fa fa-copy" aria-hidden="true"></i>
					</button>
					<button
						onClick={handleLeaveBoard}
						className="ml-4 text-red-400 text-3xl font-bold rounded transition-colors cursor-pointer"
					>
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
					initialStrokes={strokes}
					ownerId={ownerId}
				/>
			</div>
		</div>
	);
}
