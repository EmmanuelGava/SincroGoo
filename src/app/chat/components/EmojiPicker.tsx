import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Tooltip
} from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiPickerComponent({ onEmojiSelect, disabled }: EmojiPickerComponentProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Emojis">
        <span>
          <IconButton
            ref={buttonRef}
            size="small"
            disabled={disabled}
            onClick={handleClick}
            sx={{ 
              mb: 0.5,
              color: open ? 'primary.main' : 'inherit'
            }}
          >
            <EmojiEmotionsIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{
          '& .MuiPopover-paper': {
            overflow: 'visible',
            mt: -1
          }
        }}
      >
        <Box sx={{ p: 1 }}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.DARK}
            width={320}
            height={400}
            searchDisabled={false}
            skinTonesDisabled={false}
            previewConfig={{
              showPreview: false
            }}
          />
        </Box>
      </Popover>
    </>
  );
}