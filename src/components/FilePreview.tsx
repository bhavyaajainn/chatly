import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface FilePreviewProps {
  files: File[];
  filePreviews: string[];
  onRemove: (index: number) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, filePreviews, onRemove }) => {
  return (
    <Box display="flex" flexWrap="wrap" mt={2}>
      {files.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        return (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            width={100}
            height={100}
            border="1px solid #ccc"
            borderRadius="8px"
            overflow="hidden"
            mr={2}
            mb={2}
          >
            {isImage ? (
              <img
                src={filePreviews[index]}
                alt={file.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Typography
                variant="body2"
                textAlign="center"
                p={1}
                sx={{ wordBreak: 'break-all' }}
              >
                {file.name}
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={() => onRemove(index)}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
};

export default FilePreview;
