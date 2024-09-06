import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../reduxStore';
import { Box, useMediaQuery, Theme } from '@mui/material';
import SideBar from '../components/SideBar';
import { useNavigate } from 'react-router-dom';
import ChatArea from '../components/ChatArea';

const Chat: React.FC = () => {
  const user = useSelector((state: RootState) => state.user) as { uid: string | null };
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [selectedMessage, setSelectedMessage] = useState<boolean>(false);

  useEffect(() => {
    if (!user || user.uid === null) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.uid === null) {
    return null; 
  }

  const handleSelectMessage = () => {
    setSelectedMessage(true);
  };

  const handleBackClick = () => {
    setSelectedMessage(false);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {!isMobile || !selectedMessage ? (
        <Box
          sx={{
            flex: 1,
            width: isMobile ? '100%' : '40%',
            backgroundColor: '#f0f0f0',
            padding: 2,
            borderRight: '1px solid #ddd',
          }}
        >
          <SideBar onSelectMessage={handleSelectMessage} />
        </Box>
      ) : null}

      {!isMobile || selectedMessage ? (
        <Box
          sx={{
            flex: 2,
            width: isMobile ? '100%' : '60%',
            padding: 2,
          }}
        >
          <ChatArea onBackClick={handleBackClick} />
        </Box>
      ) : null}
    </Box>
  );
};

export default Chat;
