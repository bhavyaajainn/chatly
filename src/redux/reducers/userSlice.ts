import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  uid: string | null;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

const initialState: UserState = {
  uid: null,
  displayName: null,
  photoURL: null,
  email: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState | null>) => {
      if (action.payload) {
        state.uid = action.payload.uid;
        state.displayName = action.payload.displayName;
        state.photoURL = action.payload.photoURL;
        state.email = action.payload.email;
      } else {
        state.uid = null;
        state.displayName = null;
        state.photoURL = null;
        state.email = null;
      }
    },
  },
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;
