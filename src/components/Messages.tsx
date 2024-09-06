import React, { useEffect, useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
  DocumentReference,
  DocumentData,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { fetchUserData, getRandomLightColor } from "../utils/Utils";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../reduxStore";
import {
  setAcceptedFriends,
  removeFriend,
  setMostRecentFriend,
} from "../redux/reducers/friendSlice";

interface MessagesProps {
  onSelectMessage: () => void;
}

const Messages: React.FC<MessagesProps> = ({ onSelectMessage }) => {
  const dispatch = useDispatch();
  const acceptedFriends = useSelector(
    (state: RootState) => state.friends.acceptedFriends
  );

  const [filteredFriends, setFilteredFriends] = useState<DocumentData[]>(
    acceptedFriends || []
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedFriend, setSelectedFriend] = useState<null | DocumentData>(
    null
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");

  useEffect(() => {
    const savedFriends = localStorage.getItem("acceptedFriends");
    const recentFriend = localStorage.getItem("recentFriend");
    if (savedFriends) {
      const parsedFriends = JSON.parse(savedFriends);
      dispatch(setAcceptedFriends(parsedFriends));
      setFilteredFriends(parsedFriends);

      if (recentFriend) {
        const recentFriendData = parsedFriends.find(
          (friend: DocumentData) => friend.id === recentFriend
        );
        if (recentFriendData) {
          dispatch(setMostRecentFriend(recentFriendData));
          setSelectedFriend(recentFriendData);
        }
      }
    }
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setLoading(true);
      const uniqueFriends = new Map<string, DocumentData>();

      const receiverQuery = query(
        collection(db, "friendRequests"),
        where("status", "==", "accepted"),
        where("receiverUid", "==", currentUser.uid)
      );

      const senderQuery = query(
        collection(db, "friendRequests"),
        where("status", "==", "accepted"),
        where("senderUid", "==", currentUser.uid)
      );

      const fetchFriendsData = async (snapshot: any, key: string) => {
        await Promise.all(
          snapshot.docs.map(async (doc: any) => {
            const data = doc.data();
            const friendUid = data[key];
            if (!uniqueFriends.has(friendUid)) {
              const friendData = await fetchUserData(friendUid);
              uniqueFriends.set(friendUid, {
                ...friendData,
                id: doc.id,
                friendUid,
                backgroundColor: getRandomLightColor(),
              });
            }
          })
        );
      };

      const unsubscribeReceiver = onSnapshot(receiverQuery, (snapshot) => {
        fetchFriendsData(snapshot, "senderUid")
          .then(() => {
            const friendsArray = Array.from(uniqueFriends.values());
            dispatch(setAcceptedFriends(friendsArray));
            setFilteredFriends(friendsArray);

            localStorage.setItem(
              "acceptedFriends",
              JSON.stringify(friendsArray)
            );
          })
          .finally(() => {
            setLoading(false);
          });
      });

      const unsubscribeSender = onSnapshot(senderQuery, (snapshot) => {
        fetchFriendsData(snapshot, "receiverUid")
          .then(() => {
            const friendsArray = Array.from(uniqueFriends.values());
            dispatch(setAcceptedFriends(friendsArray));
            setFilteredFriends(friendsArray);

            localStorage.setItem(
              "acceptedFriends",
              JSON.stringify(friendsArray)
            );
          })
          .finally(() => {
            setLoading(false);
          });
      });

      return () => {
        unsubscribeReceiver();
        unsubscribeSender();
      };
    } else {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    setFilteredFriends(
      acceptedFriends?.filter((friend) =>
        friend?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []
    );
  }, [searchTerm, acceptedFriends]);

  const removeFriendFromLocalStorage = (friendId: string) => {
    let storedFriends = JSON.parse(
      localStorage.getItem("acceptedFriends") || "[]"
    );
    storedFriends = storedFriends.filter(
      (friend: any) => friend.id !== friendId
    );
    localStorage.setItem("acceptedFriends", JSON.stringify(storedFriends));

    const recentFriend = localStorage.getItem("recentFriend");
    if (recentFriend === friendId) {
      localStorage.removeItem("recentFriend");
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    friend: DocumentData
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedFriend(friend);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFriend(null);
  };

  const handleRemoveFriend = async () => {
    if (selectedFriend && selectedFriend.id) {
      try {
        await deleteDoc(doc(db, "friendRequests", selectedFriend.id));
        dispatch(removeFriend(selectedFriend.id));
        removeFriendFromLocalStorage(selectedFriend.id);
        handleMenuClose();
      } catch (error) {
        console.error("Error removing friend:", error);
      }
    }
  };

  const handleDeleteChat = async () => {
    if (selectedFriend) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const docId =
          currentUser.uid < selectedFriend.friendUid
            ? `${currentUser.uid}_${selectedFriend.friendUid}`
            : `${selectedFriend.friendUid}_${currentUser.uid}`;

        try {
          const messagesRef = collection(db, "chats", docId, "messages");
          const messagesSnapshot = await getDocs(messagesRef);

          messagesSnapshot.forEach(async (messageDoc) => {
            const messageData = messageDoc.data() as DocumentData;
            const deleteBy: string[] = messageData.deleteBy || [];

            const updatedDeleteBy = deleteBy.includes(currentUser.uid)
              ? deleteBy
              : [...deleteBy, currentUser.uid];

            if (updatedDeleteBy.length >= 2) {
              await deleteDoc(messageDoc.ref);
            } else {
              await updateDoc(messageDoc.ref as DocumentReference, {
                deleteBy: updatedDeleteBy,
              });
            }
          });

          setSnackbarMessage("Chat deleted successfully!");
          setSnackbarOpen(true);
        } catch (error) {
          console.error("Error deleting chat:", error);
        } finally {
          handleMenuClose();
        }
      }
    }
  };

  const handleFriendClick = (friend: DocumentData) => {
    dispatch(setMostRecentFriend(friend));
    localStorage.setItem("recentFriend", friend.id);
    setSelectedFriend(friend);
    onSelectMessage();
  };

  return (
    <Box
      sx={{
        width: "100%",
        padding: "0.2em",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search friends"
        style={{
          width: "100%",
          padding: "8px 12px",
          marginBottom: "0.5em",
          borderRadius: "4px",
          border: "1px solid #748D92",
          fontSize: "16px",
          boxSizing: "border-box",
          outline: "none",
          transition: "border-color 0.3s",
          backgroundColor: "transparent",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#748D92")}
        onBlur={(e) => (e.target.style.borderColor = "#748D92")}
      />

      <Box
        sx={{
          width: "100%",
          maxWidth: "600px",
          height: "20em",
          overflowY: "auto",
          padding: "0 1em",
        }}
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress />
          </Box>
        ) : filteredFriends.length > 0 ? (
          filteredFriends.map((friend: DocumentData, index: number) => (
            <React.Fragment key={friend.id}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
                p={1}
                sx={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedFriend?.id === friend.id
                      ? "#e0e0e0"
                      : "transparent",
                  "&:hover": {
                    backgroundColor: "lightgray",
                  },
                }}
              >
                <Box display="flex" alignItems="center">
                  <Box
                    display="flex"
                    alignItems="center"
                    onClick={() => handleFriendClick(friend)}
                  >
                    <Avatar
                      src={friend.avatarUrl}
                      alt={friend.displayName}
                      sx={{
                        backgroundColor: friend.avatarUrl
                          ? "transparent"
                          : friend.backgroundColor,
                      }}
                    >
                      {!friend.avatarUrl &&
                        friend.displayName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography ml={2}>{friend.displayName}</Typography>
                  </Box>
                </Box>

                <IconButton onClick={(event) => handleMenuOpen(event, friend)}>
                  <MoreVert />
                </IconButton>
              </Box>
              {index < filteredFriends.length - 1 && <Divider />}
            </React.Fragment>
          ))
        ) : (
          <Typography>No friends found.</Typography>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteChat}>Delete Chat</MenuItem>
        <MenuItem onClick={handleRemoveFriend}>Remove friend</MenuItem>
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Messages;
