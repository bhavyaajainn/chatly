import { Timestamp } from "firebase/firestore";

export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
    imageUrls: string[];
    files: { name: string; url: string }[];
    gifUrl?: string;
    deleteBy?: string[];
  }
  
export interface ChatAreaProps {
    onBackClick: () => void;
  }