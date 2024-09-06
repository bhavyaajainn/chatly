import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DocumentData } from 'firebase/firestore';

interface FriendState {
  acceptedFriends: DocumentData[];
  mostRecentFriend: DocumentData | null;
}

const initialState: FriendState = {
  acceptedFriends: [],
  mostRecentFriend: null,
};

const friendSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    setAcceptedFriends(state, action: PayloadAction<DocumentData[]>) {
      state.acceptedFriends = action.payload;
    },
    setMostRecentFriend(state, action: PayloadAction<DocumentData>) {
      state.mostRecentFriend = action.payload;
    },
    removeFriend(state, action: PayloadAction<string>) {
      state.acceptedFriends = state.acceptedFriends.filter(
        (friend) => friend.id !== action.payload
      );

      if (state.mostRecentFriend?.id === action.payload) {
        state.mostRecentFriend =
          state.acceptedFriends.length > 0
            ? state.acceptedFriends[0]
            : null;
      }
    },
  },
});

export const { setAcceptedFriends, setMostRecentFriend, removeFriend } = friendSlice.actions;
export default friendSlice.reducer;
