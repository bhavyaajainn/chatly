import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import LogoutIcon from "@mui/icons-material/Logout";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import { useSelector } from "react-redux";
import { RootState } from "../reduxStore";
import { auth, storage, db } from "../config/firebaseConfig";
import { signOut, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Requests from "./Requests";
import { getRandomLightColor } from "../utils/Utils";
import Messages from "./Messages";

interface SideBarProps {
  onSelectMessage: () => void;
}

const SideBar: React.FC<SideBarProps> = ({ onSelectMessage }) => {
  const [tab, setTab] = React.useState<"messages" | "requests">("messages");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [avatarBackgroundColor, setAvatarBackgroundColor] =
    useState<string>("transparent");
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleFullImageOpen = () => {
    setOpenDialog(true);
    setAnchorEl(null);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: "messages" | "requests"
  ) => {
    setTab(newValue);
  };

  const handleAvatarClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSnackbarMessage("Successfully logged out");
      setSnackbarOpen(true);
      navigate("/");
    } catch (error) {
      setSnackbarMessage("Error signing out");
      setSnackbarOpen(true);
    }
    handleMenuClose();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleCopyId = () => {
    if (user?.displayName) {
      navigator.clipboard
        .writeText(user.displayName)
        .then(() => {
          setSnackbarMessage("Username copied to clipboard");
          setSnackbarOpen(true);
        })
        .catch(() => {
          setSnackbarMessage("Failed to copy Username");
          setSnackbarOpen(true);
        });
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const currentUser = auth.currentUser;

      if (currentUser) {
        const imageRef = ref(storage, `profile_images/${currentUser.uid}`);
        try {
          await uploadBytes(imageRef, file);
          const photoURL = await getDownloadURL(imageRef);

          await updateProfile(currentUser, { photoURL });

          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(userDocRef, {
            displayName: currentUser.displayName || currentUser.email,
            photoURL,
            email: currentUser.email,
          });

          setProfileImageUrl(photoURL);

          setSnackbarMessage("Profile image updated successfully!");
          setSnackbarOpen(true);

          setAnchorEl(null);
          window.location.reload();
        } catch (error) {
          setSnackbarMessage("Failed to upload image.");
          setSnackbarOpen(true);
        }
      }
    }
  };

  useEffect(() => {
    if (user?.uid) {
      const savedColor = localStorage.getItem(`avatarColor-${user.uid}`);
      if (savedColor) {
        setAvatarBackgroundColor(savedColor);
      } else {
        const newColor = getRandomLightColor();
        localStorage.setItem(`avatarColor-${user.uid}`, newColor);
        setAvatarBackgroundColor(newColor);
      }
      setProfileImageUrl(user?.photoURL || null);
    }
  }, [user?.uid]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: isSmallScreen ? "column" : "row",
            alignItems: "center",
            padding: 2,
            gap: 3,
          }}
        >
          <IconButton onClick={handleAvatarClick} sx={{ padding: 0 }}>
            <Avatar
              src={profileImageUrl || ""}
              alt="User Avatar"
              sx={{
                width: isSmallScreen ? 50 : 60,
                height: isSmallScreen ? 50 : 60,
                fontSize: isSmallScreen ? "2em" : "3em",
                textAlign: "center",
                backgroundColor: profileImageUrl
                  ? "transparent"
                  : avatarBackgroundColor,
              }}
            >
              {!profileImageUrl && user?.email?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexDirection: isSmallScreen ? "column" : "row",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                backgroundColor: "grey.300",
                padding: isSmallScreen ? 0.5 : 1,
                textAlign: "left",
                fontSize: isSmallScreen ? "0.9rem" : "1rem",
              }}
            >
              Username: {user?.displayName}
              <IconButton
              onClick={handleCopyId}
              sx={{
                padding: 1,
              }}
            >
              <CopyAllIcon fontSize={isSmallScreen ? "medium" : "large"} />
            </IconButton>
            </Typography>
            
          </Box>
        </Box>

        <Tabs
          value={tab}
          onChange={handleTabChange}
          aria-label="sidebar tabs"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            width: "100%",
          }}
          variant={isSmallScreen ? "fullWidth" : "standard"}
          centered={isSmallScreen}
        >
          <Tab
            label="Messages"
            value="messages"
            sx={{
              flex: 1,
              textAlign: "center",
              marginRight: 1,
              fontSize: isSmallScreen ? "0.8rem" : "1rem",
            }}
          />
          <Tab
            label="Requests"
            value="requests"
            sx={{
              flex: 1,
              textAlign: "center",
              marginLeft: 1,
              fontSize: isSmallScreen ? "0.8rem" : "1rem",
            }}
          />
        </Tabs>
      </Box>

      <Box sx={{ padding: 2, flex: 1 }}>
        {tab === "messages" && <Messages onSelectMessage={onSelectMessage} />}
        {tab === "requests" && <Requests />}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleFullImageOpen}>
          <Typography variant="body1">View Full Image</Typography>
        </MenuItem>
        <MenuItem
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <input
            type="file"
            accept="image/*"
            id="profile-image-upload"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          <label
            htmlFor="profile-image-upload"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <PhotoCameraIcon sx={{ marginRight: 1 }} />
            <Typography variant="body1">
              {user?.photoURL ? "Update Image" : "Upload Image"}
            </Typography>
          </label>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Box>
            <ListItemIcon>
              <LogoutIcon color="error" />
            </ListItemIcon>
          </Box>
          <Box>
            <ListItemText primary="Logout" />
          </Box>
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
        }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarMessage.includes("Error") ? "error" : "success"}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        maxWidth={isSmallScreen ? "sm" : "lg"}
        fullWidth
      >
        <DialogContent
          sx={{
            padding: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: isSmallScreen ? "auto" : "100vh",
          }}
        >
          <img
            src={profileImageUrl || ""}
            alt="Full User Avatar"
            style={{
              width: "100%",
              height: isSmallScreen ? "auto" : "100%",
              objectFit: "contain",
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SideBar;
