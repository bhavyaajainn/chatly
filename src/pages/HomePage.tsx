import React, { useState } from "react";
import {
  Box,
  Typography,
  Container,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LoginPage from "../components/LoginPage";
import ErrorSnackbar from "../components/ErrorSnackbar";

const HomePage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const appName = "Chatly";
  const infoText = "Welcome to Chatly, your go-to chat application for seamless communication. Connect with friends, share updates, and stay in touch with those who matter most. Discover a range of features designed to make chatting effortless and fun. Get started now!";

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <Box
        sx={{
          flex: 1,
          background:
            "linear-gradient(to bottom right, #748D92, #D3D9D4, #124E66, #2E3944, #212A31)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? 2 : 4,
          fontFamily: "Roboto, sans-serif",
        }}
      >
        <Typography
          sx={{
            fontFamily: "Lobster, cursive",
            marginBottom: 2,
            fontSize: isMobile ? "2rem" : "3rem",
          }}
        >
          {appName}
        </Typography>
        <Typography
          sx={{
            textAlign: "center",
            fontSize: isMobile ? "1rem" : "1.2rem",
            color: "#E0E0E0",
          }}
        >
          {infoText}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <LoginPage setError={setError} />
        </Container>
      </Box>
      <ErrorSnackbar
        open={Boolean(error)}
        message={error || ""}
        onClose={() => setError(null)}
      />
    </Box>
  );
};

export default HomePage;
