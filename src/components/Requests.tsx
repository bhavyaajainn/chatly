import React, { useState, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Avatar,
  useTheme,
  TextField,
  InputAdornment,
  Snackbar,
  IconButton,
} from "@mui/material";
import { CheckCircle, Cancel } from "@mui/icons-material";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  DocumentData,
  getDocs,
} from "firebase/firestore";

import { auth, db } from "../config/firebaseConfig";
import SendIcon from '@mui/icons-material/Send';
import { a11yProps, fetchUserData, handleAcceptRequest, handleCancelSentRequest, handleRejectRequest, TabPanel } from "../utils/Utils";

const Requests=()=> {
  const [value, setValue] = useState<number>(0);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [receivedRequests, setReceivedRequests] = useState<DocumentData[]>([]);
  const [sentRequests, setSentRequests] = useState<DocumentData[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const theme = useTheme();

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const receivedQuery = query(
        collection(db, "friendRequests"),
        where("receiverDisplayName", "==", currentUser.displayName),
        where("status", "==", "pending")
      );

      const sentQuery = query(
        collection(db, "friendRequests"),
        where("senderDisplayName", "==", currentUser.displayName),
        where("status", "==", "pending")
      );

      const unsubscribeReceived = onSnapshot(
        receivedQuery,
        async (snapshot) => {
          const requests = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              const senderData = await fetchUserData(data.senderUid);
              return { ...data, id: doc.id, senderData };
            })
          );
          setReceivedRequests(requests);
        }
      );

      const unsubscribeSent = onSnapshot(sentQuery, async (snapshot) => {
        const requests = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const receiverData = await fetchUserData(data.receiverUid);
            return { ...data, id: doc.id, receiverData };
          })
        );
        setSentRequests(requests);
      });

      return () => {
        unsubscribeReceived();
        unsubscribeSent();
      };
    }
  }, []);

 
const sendFriendRequest = async (
  receiverDisplayName: string,
  setSnackbarMessage: React.Dispatch<React.SetStateAction<string>>,
  setSnackbarOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    setSnackbarMessage("You need to be logged in to send a friend request.");
    setSnackbarOpen(true);
    return;
  }

  if (!receiverDisplayName.trim()) {
    setSnackbarMessage("Please enter a valid display name.");
    setSnackbarOpen(true);
    return;
  }

  const inputElement = document.getElementById("receiverDisplayName") as HTMLInputElement;

  try {
    const receiverQuery = query(collection(db, "users"), where("displayName", "==", receiverDisplayName));
    const receiverSnapshot = await getDocs(receiverQuery);
  
    if (receiverSnapshot.empty) {
      setSnackbarMessage("No user found with the provided display name.");
      setSnackbarOpen(true);
      if (inputElement) inputElement.value = "";
      return;
    }

    const receiverDoc = receiverSnapshot.docs[0];
    const receiverUid = receiverDoc.id;

    const existingFriendQuery = query(
      collection(db, "friendRequests"),
      where("senderUid", "in", [currentUser.uid, receiverUid]),
      where("receiverUid", "in", [currentUser.uid, receiverUid]),
      where("status", "==", "accepted")
    );

    const existingFriendSnapshot = await getDocs(existingFriendQuery);
    if (existingFriendSnapshot.size > 0) {
      setSnackbarMessage("You are already friends.");
      setSnackbarOpen(true);
      if (inputElement) inputElement.value = "";
      return;
    }
    const existingRequestQuery = query(
      collection(db, "friendRequests"),
      where("senderUid", "==", currentUser.uid),
      where("receiverUid", "==", receiverUid),
      where("status", "==", "pending")
    );

    const querySnapshot = await getDocs(existingRequestQuery);
    if (querySnapshot.size > 0) {
      setSnackbarMessage("A pending friend request already exists.");
      setSnackbarOpen(true);
      return;
    }
    await addDoc(collection(db, "friendRequests"), {
      senderUid: currentUser.uid,
      senderDisplayName: currentUser.displayName,
      receiverUid: receiverUid,
      receiverDisplayName: receiverDisplayName,
      status: "pending",
      createdAt: new Date(),
    });

    setSnackbarMessage("Friend request sent successfully!");
    setSnackbarOpen(true);
    if (inputElement) inputElement.value = "";
  } catch (error) {
    setSnackbarMessage("Failed to send friend request.");
    setSnackbarOpen(true);
    console.error("Error sending friend request: ", error);
  }
};

  


  return (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        padding: "0 1em",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
        <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mb: 1,
        p: '0.5em',
        borderRadius: '0.5em',
        width: '100%',
        maxWidth: '600px', 
        boxSizing: 'border-box',
      }}
    >
      <TextField
        id="receiverUid"
        placeholder="Enter friend ID" 
        variant="outlined"
        size="small"
        sx={{
          width: '100%', 
          maxWidth: '90%', 
          ".MuiInputBase-input": {
            fontSize: '0.875rem',
          },
          ".MuiButtonBase-root": {
            padding: '6px 8px',
            fontSize: '0.9rem',
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                color="success"
                onClick={() =>
                  sendFriendRequest(
                    (document.getElementById('receiverUid') as HTMLInputElement)
                      .value, setSnackbarMessage, setSnackbarOpen
                  )
                }
              >
                <SendIcon /> 
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            paddingRight: '0 !important',
          },
        }}
      />
    </Box>

      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="sent and received tabs"
        centered
        sx={{
          "& .MuiTabs-indicator": {
            display: "none",
          },
          width: "100%",
          maxWidth: "600px", 
          boxSizing: "border-box",
          mt: 1, 
        }}
      >
        <Tab
          label="Received"
          {...a11yProps(0)}
          sx={{
            backgroundColor:
              value === 0
                ? theme.palette.primary.main
                : theme.palette.background.paper,
            color: value === 0 ? "white !important" : "black !important",
            borderRadius: 1,
            marginRight: { xs: 0, sm: 1 }, 
            width: { xs: "50%", sm: "auto" }, 
          }}
        />
        <Tab
          label="Sent"
          {...a11yProps(1)}
          sx={{
            backgroundColor:
              value === 1
                ? theme.palette.primary.main
                : theme.palette.background.paper,
            color: value === 1 ? "white !important" : "black !important",
            borderRadius: 1,
            width: { xs: "50%", sm: "auto" }, 
          }}
        />
      </Tabs>

      <Box
        sx={{
          height: "15em",
          overflowY: "auto",
          width: "100%",
          maxWidth: "600px", 
          mt: 1,
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ p: "0 !important" }}>
          <TabPanel value={value} index={0}>
            <Box
              sx={{
                maxHeight: "100%",
                overflowY: "auto",
                padding: 0,
                paddingRight: 2,
              }}
            >
              {receivedRequests.length > 0 ? (
                receivedRequests.map((request, index) => (
                  <Box
                    key={index}
                    display="flex"
                    alignItems="center"
                    padding="0 !important"
                    m={1} 
                    justifyContent="space-between"
                    flexDirection={{
                      xs: "column",
                      sm: "row",
                    }} 
                    textAlign={{ xs: "center", sm: "left" }} 
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent={{ xs: "center", sm: "flex-start" }} 
                    >
                      <Avatar
                        src={request.senderData?.avatarUrl}
                        alt={request.senderData?.displayName}
                        sx={{
                          backgroundColor:
                            request.senderData?.backgroundColor,
                        }}
                      >
                        {!request.senderData?.avatarUrl &&
                          request.senderData?.displayName?.charAt(0)}
                      </Avatar>
                      <Typography ml={2}>
                        {request.senderData?.displayName}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        gap: 0.5,
                        "@media (max-width: 600px)": {
                          flexDirection: "column",
                          alignItems: "center",
                        },
                      }}
                    >
                      <IconButton
                        sx={{ color: "green" }}
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <CheckCircle />
                      </IconButton>
                      <IconButton
                        sx={{ color: "red" }}
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <Cancel />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography>No received requests.</Typography>
              )}
            </Box>
          </TabPanel>
        </Box>
        <Box sx={{ p: "0 !important" }}>
          <TabPanel value={value} index={1}>
            <Box
              sx={{
                maxHeight: "100%",
                overflowY: "auto",
                padding: 0,
                paddingRight: 2,
              }}
            >
              {sentRequests.length > 0 ? (
                sentRequests.map((request, index) => (
                  <Box
                    key={index}
                    display="flex"
                    alignItems="center"
                    mb={1}
                    justifyContent="space-between"
                    flexDirection={{
                      xs: "column",
                      sm: "row",
                    }} 
                    textAlign={{ xs: "center", sm: "left" }} 
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent={{ xs: "center", sm: "flex-start" }} 
                    >
                      <Avatar
                        src={request.receiverData?.avatarUrl}
                        alt={request.receiverData?.displayName}
                        sx={{
                          backgroundColor:
                            request.receiverData?.backgroundColor,
                        }}
                      >
                        {!request.receiverData?.avatarUrl &&
                          request.receiverData?.displayName?.charAt(0)}
                      </Avatar>
                      <Typography ml={2}>
                        {request.receiverData?.displayName}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        sx={{ color: "red" }}
                        onClick={() => handleCancelSentRequest(request.id, setSentRequests)}
                      >
                        <Cancel />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography>No sent requests.</Typography>
              )}
            </Box>
          </TabPanel>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}

export default Requests;