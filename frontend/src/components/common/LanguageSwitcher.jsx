import React from 'react';
import {
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import {
  Language as LanguageIcon
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LanguageSwitcher({ variant = 'icon' }) {
  const { language, languageInfo, changeLanguage, getSupportedLanguages } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    handleClose();
  };

  const languages = getSupportedLanguages();

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ ml: 1 }}
        aria-controls={open ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <LanguageIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id="language-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={language === lang.code}
            sx={{
              bgcolor: language === lang.code ? 'action.selected' : 'transparent'
            }}
          >
            <ListItemIcon>
              <Typography variant="body2">{lang.flag || lang.emoji || '🌐'}</Typography>
            </ListItemIcon>
            <ListItemText
              primary={lang.nativeName || lang.name}
              secondary={lang.name !== lang.nativeName ? lang.name : undefined}
            />
            {language === lang.code && (
              <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
                ✓
              </Typography>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

