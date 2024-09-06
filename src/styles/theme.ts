import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#748D92",
    },
    secondary: {
      main: "#D3D9D4",
    },
    info: {
      main: "#124E66",
    },
    background: {
      default: "#2E3944",
    },
    success: {
      main: "#212A31",
    },
  },
  typography: {
    fontFamily: "Inter",
    h1: {
      fontSize: "2rem",
    },
    body1: {
      fontSize: "1rem",
    },
  },
  spacing: 8,
});

export default theme;
