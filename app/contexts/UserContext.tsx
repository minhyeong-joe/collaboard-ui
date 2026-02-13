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
  const [userId] = useState<string>(() => 
    `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [nickname, setNicknameState] = useState<string>("");
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);

  const setNickname = (newNickname: string) => {
    setNicknameState(newNickname);
  };

  const markVisited = () => {
    setTimeout(() => {
      setIsFirstVisit(false);
    }, 2500);
  };

  return (
    <UserContext.Provider value={{ userId, nickname, setNickname, isFirstVisit, markVisited }}>
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
