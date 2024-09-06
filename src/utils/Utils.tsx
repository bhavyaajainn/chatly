import { Box } from "@mui/material";
import { deleteDoc, doc, DocumentData, getDoc, updateDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebaseConfig";

export const validateEmail = (email: string) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return "Email is required.";
  } else if (!emailPattern.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
};

export const validatePassword = (password: string) => {
  if (!password) {
    return "Password is required.";
  }
  return null;
};

export const validateUsername = (username: string) => {
  if (!username) {
    return "Username is required.";
  }
  return null;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3} sx={{ height: "100%", overflowY: "auto" }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const a11yProps = (index: number) => {
  return {
    id: `tab-${index}`,
    "aria-controls": `tabpanel-${index}`,
  };
};

export const getRandomLightColor = () => {
  const hue = Math.floor(Math.random() * 360); 
  const saturation = 50 + Math.floor(Math.random() * 50);
  const lightness = 75 + Math.floor(Math.random() * 15); 
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

type FriendData = {
  displayName: string;
  avatarUrl?: string;
  backgroundColor: string;
};

export const fetchUserData = async (uid: string): Promise<FriendData | null> => {
  try {
    
    let avatarUrl: string | undefined;
    try {
      const avatarRef = ref(storage, `profile_images/${uid}`);
      avatarUrl = await getDownloadURL(avatarRef);
    } catch (error: any) {
      
      avatarUrl = undefined;
    }

   
    let displayName: string = "Unknown User";
    
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      displayName = userData?.displayName || userData?.email || "Unknown User";
   
      return {
        displayName,
        avatarUrl,
        backgroundColor: localStorage.getItem(`avatarColor-${uid}`) || getRandomLightColor(),
      };
    }


    let backgroundColor = localStorage.getItem(`avatarColor-${uid}`);
    if (!backgroundColor) {
      backgroundColor = getRandomLightColor();
      localStorage.setItem(`avatarColor-${uid}`, backgroundColor);
    }

    return { displayName, avatarUrl, backgroundColor};
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const handleAcceptRequest = async (requestId: string) => {
  try {
    const requestDocRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestDocRef, { status: "accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
  }
};

export const handleRejectRequest = async (requestId: string) => {
  try {
    const requestDocRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestDocRef, { status: "rejected" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
  }
};

export const handleCancelSentRequest = async (
  requestId: string,
  setSentRequests: React.Dispatch<React.SetStateAction<DocumentData[]>>
) => {
  try {
    const requestDocRef = doc(db, "friendRequests", requestId);
    await deleteDoc(requestDocRef);
    setSentRequests((prevRequests) =>
      prevRequests.filter((request) => request.id !== requestId)
    );
  } catch (error) {
    console.error("Error cancelling sent friend request:", error);
  }
};

