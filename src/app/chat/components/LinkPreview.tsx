'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

type PreviewJson = {
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  url: string;
};

export default function LinkPreview({ url, fallbackLink = false }: { url: string; fallbackLink?: boolean }) {
  const [data, setData] = useState<PreviewJson | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setImgError(false);
    fetch(`/api/chat/link-preview?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then((res) => (res.ok && res.status === 200 ? res.json() : null))
      .then((json) => {
        if (json?.title) setData(json);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      });
    return () => controller.abort();
  }, [url]);

  if (!data) {
    if (!fallbackLink) return null;
    return (
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all', fontSize: '0.875rem' }}
      >
        {url}
      </Box>
    );
  }

  const domain = (() => {
    try {
      return new URL(data.url || url).hostname.replace(/^www\./, '');
    } catch {
      return data.siteName || '';
    }
  })();

  return (
    <Box
      component="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'block',
        width: 280,
        maxWidth: '100%',
        mt: 0.75,
        borderRadius: 1.5,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {data.image && !imgError && (
        <Box
          component="img"
          src={data.image}
          alt=""
          onError={() => setImgError(true)}
          sx={{
            width: '100%',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {data.title}
        </Typography>
        {data.description ? (
          <Typography
            variant="caption"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: 'text.secondary',
              lineHeight: 1.35,
            }}
          >
            {data.description}
          </Typography>
        ) : null}
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
          {domain}
        </Typography>
      </Box>
    </Box>
  );
}
