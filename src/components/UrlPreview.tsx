import React, { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

interface UrlPreviewProps {
  url: string;
}

const UrlPreview: React.FC<UrlPreviewProps> = ({ url }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  let hostname = '';
  let protocol = '';
  let pathname = '';
  
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
    protocol = urlObj.protocol.replace(':', '');
    pathname = urlObj.pathname + urlObj.search;
  } catch (err) {
    // Invalid URL, don't show preview
    return null;
  }

  // Extract potential favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

  return (
    <div 
      className="mt-2 border rounded-lg overflow-hidden hover:border-slate-400 transition-colors relative group"
      style={{
        backgroundColor: 'var(--color-bgTertiary)',
        borderColor: 'var(--color-border)',
        maxWidth: '500px',
      }}
    >
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block p-3"
      >
        <div className="flex items-start gap-3">
          {/* Favicon */}
          <img 
            src={faviconUrl} 
            alt="" 
            className="w-8 h-8 flex-shrink-0 rounded"
            style={{
              backgroundColor: 'var(--color-bgSecondary)',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          
          <div className="flex-1 min-w-0">
            {/* Hostname/Title */}
            <div 
              className="font-semibold mb-1 truncate"
              style={{
                color: 'var(--color-text)',
                fontSize: 'var(--sizing-textSm)',
              }}
            >
              {hostname}
            </div>
            
            {/* URL path */}
            {pathname && pathname !== '/' && (
              <div 
                className="truncate mb-2"
                style={{
                  color: 'var(--color-textSecondary)',
                  fontSize: 'var(--sizing-textXs)',
                }}
              >
                {pathname}
              </div>
            )}
            
            {/* Full URL */}
            <div 
              className="flex items-center gap-1"
              style={{
                color: 'var(--color-textMuted)',
                fontSize: 'var(--sizing-textXs)',
              }}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{protocol}://{hostname}</span>
            </div>
          </div>
        </div>
      </a>
      
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDismissed(true);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-600"
        style={{
          backgroundColor: 'var(--color-bgSecondary)',
          color: 'var(--color-textMuted)',
        }}
        title="Hide preview"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default UrlPreview;
