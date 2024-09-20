import React, { useState, useEffect, useRef } from "react";
import {
  IconButton,
  Box,
  Typography,
  CircularProgress,
  TextField,
  Grid,
  InputAdornment,
  useMediaQuery,
  Theme,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DownloadIcon from "@mui/icons-material/Download";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import GifIcon from "@mui/icons-material/Gif";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { RootState } from "../reduxStore";
import TextareaAutosize from "react-textarea-autosize";
import FilePreview from "./FilePreview";
import useSound from "use-sound";
import axios from "axios";
import Picker from "@emoji-mart/react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import theme from "../styles/theme";
import { ChatAreaProps, Message } from "./types";

const ChatArea: React.FC<ChatAreaProps> = ({ onBackClick }) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showGifSearch, setShowGifSearch] = useState(false);
  const [gifResults, setGifResults] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<() => void>();
  const mostRecentFriend = useSelector(
    (state: RootState) => state.friends.mostRecentFriend
  );

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;
  const [playSend] = useSound(`${process.env.PUBLIC_URL}/media/send.mp3`);
  const [playReceive] = useSound(`${process.env.PUBLIC_URL}/media/receive.mp3`);

  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prevMessage) => prevMessage + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleGifIconClick = () => {
    setShowGifSearch((prev) => !prev);
    if (searchTerm.trim()) {
      handleGifSearch();
    }
  };

  const clearSearchTerm = () => {
    setSearchTerm("");
    setGifResults([]);
  };

  const handleGifSearch = async () => {
    const apiKey = process.env.REACT_APP_GIPHY_API_KEY?.toString();
    if (searchTerm.trim() === "") {
      setGifResults([]);
      return;
    }

    try {
      const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
        params: {
          api_key: apiKey,
          q: searchTerm,
          limit: 25,
        },
      });
      const urls = response.data.data.map(
        (gif: any) => gif.images.fixed_height.url
      );
      setGifResults(urls);
    } catch (error) {
      console.error("Error fetching GIFs:", error);
    }
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!currentUserId || !mostRecentFriend) {
      console.error("Error: No current user or recent friend found.");
      return;
    }

    setIsSending(true);
    try {
      const db = getFirestore();
      const chatId = [currentUserId, mostRecentFriend.friendUid]
        .sort()
        .join("_");
      const chatRef = doc(db, "chats", chatId);

      await addDoc(collection(chatRef, "messages"), {
        senderId: currentUserId,
        text: "",
        imageUrls: [],
        files: [],
        gifUrl: gifUrl,
        timestamp: Timestamp.now(),
      });

      await setDoc(
        chatRef,
        {
          participants: [currentUserId, mostRecentFriend.friendUid],
          lastMessage: "GIF",
          lastMessageTimestamp: Timestamp.now(),
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );

      playSend();
    } catch (error) {
      console.error("Error sending GIF message:", error);
    } finally {
      setIsSending(false);
      setShowGifSearch(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews((prevPreviews) => [
            ...prevPreviews,
            reader.result as string,
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setFilePreviews((prevPreviews) =>
      prevPreviews.filter((_, i) => i !== index)
    );
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleGifSearch();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const uploadFiles = async () => {
    if (!files.length || !currentUserId || !mostRecentFriend)
      return { imageUrls: [], files: [] };

    const storage = getStorage();
    const imageUrls: string[] = [];
    const fileData: { name: string; url: string }[] = [];

    await Promise.all(
      files.map(async (file) => {
        const fileRef = ref(
          storage,
          `chatFiles/${mostRecentFriend.friendUid}/${Date.now()}_${file.name}`
        );
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        if (file.type.startsWith("image/")) {
          imageUrls.push(url);
        } else {
          fileData.push({ name: file.name, url }); // Add file name and URL for non-image files
        }
      })
    );

    return { imageUrls, files: fileData };
  };

  const handleSend = async () => {
    if (message.trim() === "" && files.length === 0) return;

    if (!currentUserId || !mostRecentFriend) {
      console.error("Error: No current user or recent friend found.");
      return;
    }

    setIsSending(true);

    try {
      const db = getFirestore();
      const chatId = [currentUserId, mostRecentFriend.friendUid]
        .sort()
        .join("_");
      const chatRef = doc(db, "chats", chatId);

      const { imageUrls, files: uploadedFiles } = await uploadFiles();

      await addDoc(collection(chatRef, "messages"), {
        senderId: currentUserId,
        text: message.trim(),
        imageUrls,
        files: uploadedFiles,
        gifUrl: "",
        timestamp: Timestamp.now(),
      });

      await setDoc(
        chatRef,
        {
          participants: [currentUserId, mostRecentFriend.friendUid],
          lastMessage:
            message.trim() ||
            (imageUrls.length > 0
              ? "📷 Photo"
              : uploadedFiles.length > 0
              ? "📄 File"
              : ""),
          lastMessageTimestamp: Timestamp.now(),
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );

      setMessage("");
      setFiles([]);
      setFilePreviews([]);

      playSend();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const lastPlayedMessageTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (mostRecentFriend && currentUserId) {
      const db = getFirestore();
      const chatId = [currentUserId, mostRecentFriend.friendUid]
        .sort()
        .join("_");
      const chatRef = doc(db, "chats", chatId);

      const q = query(collection(chatRef, "messages"), orderBy("timestamp"));

      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Message;
            return { ...data };
          })
          .filter(
            (message) =>
              !message.deleteBy || !message.deleteBy.includes(currentUserId)
          );

        if (fetchedMessages.length > 0) {
          const latestMessage = fetchedMessages[fetchedMessages.length - 1];
          const latestTimestamp = latestMessage.timestamp.toMillis();

          if (
            lastPlayedMessageTimestampRef.current === null ||
            latestTimestamp > lastPlayedMessageTimestampRef.current
          ) {
            lastPlayedMessageTimestampRef.current = latestTimestamp;

            if (latestMessage.senderId !== currentUserId) {
              playReceive();
            }
          }
        }

        setMessages(fetchedMessages);
        setLoading(false);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    }
  }, [mostRecentFriend, currentUserId, playReceive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      sx={{ height: "100vh" }}
    >
      {isMobile && (
        <Box display="flex" alignItems="center" p={2}>
          <IconButton onClick={onBackClick}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">{mostRecentFriend?.displayName}</Typography>
        </Box>
      )}
      {mostRecentFriend ? (
        <Box
          display="flex"
          flexDirection="column"
          flexGrow={1}
          sx={{
            overflow: "hidden",
            position: "relative", // Make sure GIF search box stays within chat area
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              p: 2,
              overflowY: "auto",
              backgroundColor: "#f5f5f5",
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
            ) : messages.length > 0 ? (
              messages.map(
                ({ text, senderId, imageUrls, files, gifUrl, timestamp }, index) => (
                  <Box
                    key={`msg-${index}`}
                    display="flex"
                    justifyContent={
                      senderId === currentUserId ? "flex-end" : "flex-start"
                    }
                    mb={2}
                  >
                    <Box
                      sx={{
                        backgroundColor:
                          senderId === currentUserId
                            ? theme.palette.primary.main
                            : theme.palette.grey[300],
                        color:
                          senderId === currentUserId
                            ? "#fff"
                            : theme.palette.text.primary,
                        padding: "10px",
                        borderRadius: "10px",
                        maxWidth: "60%",
                        wordWrap: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {text && (
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {text}
                        </Typography>
                      )}

                      {gifUrl && (
                        <img
                          src={gifUrl}
                          alt="gif"
                          style={{
                            width: "100%",
                            height: "auto",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      )}

                      {imageUrls.length > 0 &&
                        imageUrls.map((url, index) => (
                          <Box key={index} position="relative">
                            <img
                              src={url}
                              alt={`img-${index}`}
                              style={{
                                width: "100%",
                                height: "auto",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                            />
                            <IconButton
                              size="small"
                              sx={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                color: "#fff",
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                              }}
                              href={url}
                              download={`image-${index}`}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Box>
                        ))}

                      {/* Display non-image files like PDFs */}
                      {files.length > 0 &&
                        files.map((file, index) => (
                          <Box key={index} display="flex" alignItems="center" sx={{ mt: 2 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#000",
                                textDecoration: "underline",
                              }}
                            >
                              {file.name}
                            </Typography>
                            <IconButton
                              href={file.url}
                              download={file.name}
                              sx={{ ml: 2 }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Box>
                        ))}

                      <Typography
                        variant="caption"
                        display="block"
                        textAlign="right"
                        sx={{ mt: 1, opacity: 0.7 }}
                      >
                        {timestamp.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Box>
                  </Box>
                )
              )
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
                sx={{ color: "#aaa" }}
              >
                <Typography variant="h6" color="textSecondary">
                  No messages yet.
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {showGifSearch && (
            <Box
              sx={{
                position: "absolute",
                bottom: "60px", // Adjust position within chat area
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                padding: "10px",
                borderRadius: "10px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                zIndex: 10, // Ensure the GIF search box is above the input
                maxHeight: "40vh", // Ensure it doesn't exceed chat area height
                overflowY: "auto", // Scroll when necessary
              }}
            >
              <TextField
                fullWidth
                placeholder="Search GIFs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={clearSearchTerm}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                {gifResults.length > 0 ? (
                  gifResults.map((gifUrl, index) => (
                    <Grid
                      item
                      xs={6} // 2 GIFs per row on mobile
                      sm={4} // 3 GIFs per row on tablet
                      md={3} // 4 GIFs per row on desktop
                      key={index}
                    >
                      <Box
                        component="img"
                        src={gifUrl}
                        alt={`gif-${index}`}
                        sx={{
                          width: "100%",
                          height: "auto",
                          cursor: "pointer",
                          borderRadius: "10px",
                        }}
                        onClick={() => handleGifSelect(gifUrl)}
                      />
                    </Grid>
                  ))
                ) : (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    width="100%"
                    height="100%" // Make it take up the available space
                  >
                    <Typography>No GIFs found</Typography>
                  </Box>
                )}
              </Grid>
            </Box>
          )}

          <Box
            sx={{
              borderTop: "1px solid #ddd",
              padding: "10px",
              backgroundColor: "#fff",
            }}
          >
            {filePreviews.length > 0 && (
              <FilePreview
                files={files}
                filePreviews={filePreviews}
                onRemove={removeFile}
              />
            )}
            <Box
              display="flex"
              alignItems="center"
              sx={{
                marginBottom: "4px",
                marginTop: "0 !important",
              }}
            >
              <IconButton component="label">
                <AttachFileIcon />
                <input type="file" hidden multiple onChange={handleFileChange} />
              </IconButton>

              <TextareaAutosize
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                minRows={1}
                maxRows={4}
                placeholder="Type a message"
                style={{
                  width: "100%",
                  resize: "none",
                  padding: "8px",
                  borderRadius: "20px",
                  border: "1px solid #ccc",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "16px",
                }}
              />

              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>

              {!isMobile && (
                <>
                  <IconButton
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <EmojiEmotionsIcon />
                  </IconButton>
                  {showEmojiPicker && (
                    <Box position="absolute" bottom="60px">
                      <Picker onEmojiSelect={handleEmojiSelect} />
                    </Box>
                  )}
                </>
              )}

              <IconButton color="secondary" onClick={handleGifIconClick}>
                <GifIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <Typography variant="h6" color="textSecondary">
            Select a friend to start chatting
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChatArea;
