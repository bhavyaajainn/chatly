import React, { useState, useEffect } from "react";
import {
  Box,
  Tab,
  Tabs,
  TextField,
  Button,
  IconButton,
  Typography,
  Link,
  Snackbar,
  Alert,
  InputAdornment,
  useTheme,
  CircularProgress,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage, db } from "../config/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  setDoc,
  doc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { setUser } from "../redux/reducers/userSlice";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "../utils/Utils";

interface LoginPageProps {
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const LoginPage: React.FC<LoginPageProps> = ({ setError }) => {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkEmailVerified = async () => {
      const user = auth.currentUser;
      if (user && user.emailVerified) {
        dispatch(
          setUser({
            uid: user.uid,
            displayName: user.displayName || user.email,
            photoURL: user.photoURL || null,
            email: user.email || null,
          })
        );
        navigate("/chat");
      }
    };


    const intervalId = setInterval(() => {
      checkEmailVerified();
    }, 3000);
  
    return () => {
      clearInterval(intervalId);
    };
    

  }, [dispatch, navigate]);

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: "login" | "signup"
  ) => {
    setTab(newValue);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProfileImage(event.target.files[0]);
    }
  };

  const handleLogin = async () => {
    setPasswordError(validatePassword(password));

    if (!passwordError) {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        if (user.emailVerified) {
          dispatch(
            setUser({
              uid: user.uid,
              displayName: user.displayName || user.email,
              photoURL: user.photoURL || null,
              email: user.email || null,
            })
          );
          navigate("/chat");
        } else {
          setSnackbarMessage(
            "Please verify your email address before logging in."
          );
          setSnackbarOpen(true);
        }
      } catch (error: any) {
        setError(error.message);
        setSnackbarMessage(error.message);
        setSnackbarOpen(true);
      }
    }
  };

  const handleSignup = async () => {
    setEmailError(validateEmail(email));
    setPasswordError(validatePassword(password));
    setUsernameError(validateUsername(username));

    if (!emailError && !passwordError && !usernameError) {
      setLoading(true);
      try {
        const usernameQuery = query(
          collection(db, "users"),
          where("displayName", "==", username)
        );
        const usernameSnapshot = await getDocs(usernameQuery);

        if (!usernameSnapshot.empty) {
          setUsernameError(
            "Username already exists. Please choose a different one."
          );
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        let imageUrl: any = null;

        if (user && profileImage) {
          const imageRef = ref(storage, `profile_images/${user.uid}`);
          await uploadBytes(imageRef, profileImage);
          imageUrl = await getDownloadURL(imageRef);
        }

        await updateProfile(user, {
          displayName: username,
          photoURL: imageUrl,
        });

        await setDoc(doc(db, "users", user.uid), {
          displayName: username,
          photoURL: imageUrl,
          email: user.email,
        });
        await sendEmailVerification(user);
        setSnackbarMessage(
          "Verification email sent. Please verify your email before logging in."
        );
        setSnackbarOpen(true);

        const intervalId = setInterval(async () => {
          await user.reload();
          if (user.emailVerified) {
            clearInterval(intervalId);

            dispatch(
              setUser({
                uid: user.uid,
                displayName: username,
                email: user.email,
                photoURL: imageUrl,
              })
            );

            setSnackbarMessage(
              "Email verified successfully. Redirecting to chat..."
            );
            setSnackbarOpen(true);

            navigate("/chat");
          }
        }, 3000); 
      } catch (error: any) {
        setError(error.message);
        setSnackbarMessage(error.message);
        setSnackbarOpen(true);
      } finally {
        setLoading(false); 
      }
  
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setSnackbarMessage("Please enter your email to reset the password.");
      setSnackbarOpen(true);
    } else if (validateEmail(email)) {
      setEmailError(validateEmail(email));
    } else {
      try {
        await sendPasswordResetEmail(auth, email);
        setSnackbarMessage(
          "Password reset email sent. Please check your inbox."
        );
        setSnackbarOpen(true);
      } catch (error: any) {
        setError(error.message);
        setSnackbarMessage(error.message);
        setSnackbarOpen(true);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      if (tab === "login") {
        handleLogin();
      } else if (tab === "signup") {
        handleSignup();
      }
    }
  };

  return (
    <Box
      sx={{ width: "100%", maxWidth: 400, margin: "auto", padding: 2 }}
      onKeyDown={handleKeyDown}
    >
      <Tabs value={tab} onChange={handleTabChange} centered>
        <Tab label="Login" value="login" />
        <Tab label="Signup" value="signup" />
      </Tabs>

      {tab === "login" && (
        <Box sx={{ padding: 2 }}>
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            margin="normal"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            margin="normal"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!passwordError}
            helperText={passwordError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            fullWidth
            variant="contained"
            sx={{ marginTop: 2, backgroundColor: theme.palette.success.main }}
            onClick={handleLogin}
          >
            Login
          </Button>
          <Box sx={{ marginTop: 2, textAlign: "center" }}>
            <Typography variant="body2">
              Forgot your password?{" "}
              <Link
                component="button"
                variant="body2"
                onClick={handleForgotPassword}
                sx={{ cursor: "pointer", color: "primary.main" }}
              >
                Reset Password
              </Link>
            </Typography>
          </Box>
          <Box sx={{ marginTop: 2, textAlign: "center" }}>
            <Typography variant="body2">
              Don't have an account?{" "}
              <Link
                component="button"
                variant="body2"
                onClick={() => setTab("signup")}
                sx={{ cursor: "pointer", color: "primary.main" }}
              >
                Signup
              </Link>
            </Typography>
          </Box>
        </Box>
      )}

      {tab === "signup" && (
        <Box sx={{ padding: 2 }}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            margin="normal"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={!!usernameError}
            helperText={usernameError}
          />
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            margin="normal"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            margin="normal"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!passwordError}
            helperText={passwordError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ marginTop: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body1" sx={{ marginRight: 2 }}>
                Add a profile picture
              </Typography>
              <input
                type="file"
                accept="image/*"
                id="profile-image-upload"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
              <label htmlFor="profile-image-upload">
                <IconButton color="primary" component="span">
                  <PhotoCameraIcon />
                </IconButton>
              </label>
              {profileImage && (
                <Typography variant="body2" sx={{ marginLeft: 2 }}>
                  {profileImage.name}
                </Typography>
              )}
            </Box>
          </Box>
          <Button
            fullWidth
            variant="contained"
            sx={{ marginTop: 2, backgroundColor: theme.palette.success.main }}
            onClick={handleSignup}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Signup"}
          </Button>
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarMessage.includes("error") ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
