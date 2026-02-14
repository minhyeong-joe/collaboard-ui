import { io } from "socket.io-client";
import { EVENTS } from "./events";

const socket = io(import.meta.env.VITE_API_URL);

const createRoom = (roomId: string, userId: string, nickname: string, callback: (data: any) => void) => {
    socket.emit(EVENTS.CREATE_ROOM, { roomId, userId, nickname }, (data: any) => {
        callback(data);
    });
}

const joinRoom = (roomId: string, userId: string, nickname: string, callback: (response: { success: boolean; error?: string, data?: any }) => void) => {
    socket.emit(EVENTS.JOIN_ROOM, { roomId, userId, nickname }, (response: { success: boolean; error?: string, data?: any }) => {
        callback(response);
    });
}

const leaveRoom = (roomId: string, userId: string ) => {
    socket.emit(EVENTS.LEAVE_ROOM, { roomId, userId });
}

const listenForUserJoined = (callback: (data: any) => void) => {
    socket.on(EVENTS.USER_JOINED, callback);
}

const listenForUserLeft = (callback: (data: any) => void) => {
    socket.on(EVENTS.USER_LEFT, callback);
}

const listenForRoomDeleted = (callback: (data: any) => void) => {
    socket.on(EVENTS.ROOM_DELETED, callback);
}

const moveCursor = (roomId: string, userId: string, nickname: string, point: { x: number; y: number }) => {
    socket.emit(EVENTS.CURSOR_MOVE, { roomId, userId, nickname, point });
}

const listenForCursorUpdates = (callback: (data: any) => void) => {
    socket.on(EVENTS.CURSOR_UPDATE, callback);
}

const completeStroke = (roomId: string, stroke: any) => {
    socket.emit(EVENTS.DRAW, { roomId, stroke });
}

const listenForStrokes = (callback: (data: any) => void) => {
    socket.on(EVENTS.STROKE_DRAWN, callback);
}

const deleteStroke = (roomId: string, strokeId: string, userId: string) => {
    socket.emit(EVENTS.STROKE_DELETE, { roomId, strokeId, userId });
}

const listenForStrokeDeletes = (callback: (data: any) => void) => {
    socket.on(EVENTS.STROKE_DELETED, callback);
}

const cleanupListeners = () => {
    socket.off(EVENTS.USER_JOINED);
    socket.off(EVENTS.USER_LEFT);
    socket.off(EVENTS.STROKE_DRAWN);
    socket.off(EVENTS.STROKE_DELETED);
    socket.off(EVENTS.ROOM_DELETED);
    socket.off(EVENTS.CURSOR_UPDATE);
}

export default socket;

export { createRoom, joinRoom, leaveRoom, completeStroke, listenForStrokes, listenForUserJoined, listenForUserLeft, cleanupListeners, listenForRoomDeleted, moveCursor, listenForCursorUpdates, deleteStroke, listenForStrokeDeletes };