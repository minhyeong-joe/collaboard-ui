import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface UserContextType {
	userId: string;
	nickname: string;
	setNickname: (nickname: string) => void;
	isFirstVisit: boolean;
	markVisited: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
	const [userId] = useState<string>(() => {
		if (typeof window === "undefined") return "";
		const stored = window.localStorage.getItem("collaboard_userId");
		if (stored) return stored;
		const newId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
		window.localStorage.setItem("collaboard_userId", newId);
		return newId;
	});
	const [nickname, setNicknameState] = useState<string>(() => {
		if (typeof window === "undefined") return "";
		return window.localStorage.getItem("collaboard_nickname") || "";
	});
	const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);

	const setNickname = (newNickname: string) => {
		setNicknameState(newNickname);
		window.localStorage.setItem("collaboard_nickname", newNickname);
	};

	const markVisited = () => {
		setTimeout(() => {
			setIsFirstVisit(false);
		}, 2500);
	};

	return (
		<UserContext.Provider
			value={{ userId, nickname, setNickname, isFirstVisit, markVisited }}
		>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}
