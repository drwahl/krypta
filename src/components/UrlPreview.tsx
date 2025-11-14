import React, { useState, useEffect } from 'react';
import { ExternalLink, X, MessageSquare, ArrowUp, User, Calendar } from 'lucide-react';

interface UrlPreviewProps {
  url: string;
}

interface RedditPost {
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  thumbnail?: string;
  preview?: {
    images: Array<{
      source: { url: string };
    }>;
  };
  post_hint?: string;
  is_video?: boolean;
  permalink: string;
  selftext?: string;
}

// Cache for Reddit data to avoid rate limiting
const redditCache = new Map<string, RedditPost | null>();
const fetchQueue: Array<() => void> = [];
let isFetching = false;

// Process fetch queue with delays to avoid rate limiting
const processFetchQueue = () => {
  if (isFetching || fetchQueue.length === 0) return;
  
  isFetching = true;
  const nextFetch = fetchQueue.shift();
  if (nextFetch) {
    nextFetch();
    // Wait 1 second between requests to avoid rate limiting
    setTimeout(() => {
      isFetching = false;
      processFetchQueue();
    }, 1000);
  } else {
    isFetching = false;
  }
};

const UrlPreview: React.FC<UrlPreviewProps> = ({ url }) => {
  const [dismissed, setDismissed] = useState(false);
  const [redditData, setRedditData] = useState<RedditPost | null>(null);
  const [loadingReddit, setLoadingReddit] = useState(false);

  if (dismissed) {
    return null;
  }

  let hostname = '';
  let protocol = '';
  let pathname = '';
  let isReddit = false;
  
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
    protocol = urlObj.protocol.replace(':', '');
    pathname = urlObj.pathname + urlObj.search;
    
    // Check if it's a Reddit URL
    isReddit = hostname.includes('reddit.com') || hostname.includes('redd.it');
  } catch (err) {
    // Invalid URL, don't show preview
    return null;
  }

  // Extract potential favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

  // Fetch Reddit post data
  // NOTE: Disabled due to CORS issues with Reddit API and proxy services
  // Reddit links will show as basic URL previews instead
  useEffect(() => {
    // Reddit rich previews disabled - all proxy services have CORS issues
    // Just show basic URL preview instead
    return;
  }, [url, isReddit, pathname, loadingReddit, redditData]);

  // Render Reddit preview if available
  if (isReddit && redditData) {
    const thumbnail = redditData.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&');
    const hasValidThumbnail = thumbnail && !thumbnail.includes('self') && !thumbnail.includes('default');
    const timeSincePost = Math.floor((Date.now() - redditData.created_utc * 1000) / 1000);
    
    let timeString = '';
    if (timeSincePost < 60) timeString = `${timeSincePost}s ago`;
    else if (timeSincePost < 3600) timeString = `${Math.floor(timeSincePost / 60)}m ago`;
    else if (timeSincePost < 86400) timeString = `${Math.floor(timeSincePost / 3600)}h ago`;
    else timeString = `${Math.floor(timeSincePost / 86400)}d ago`;

    return (
      <div 
        className="mt-2 border rounded-lg overflow-hidden hover:border-orange-500 transition-colors relative group"
        style={{
          backgroundColor: 'var(--color-bgTertiary)',
          borderColor: '#FF4500',
          maxWidth: '600px',
        }}
      >
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <div className="flex gap-3 p-3">
            {/* Thumbnail */}
            {hasValidThumbnail && (
              <img 
                src={thumbnail} 
                alt="" 
                className="w-24 h-24 object-cover rounded flex-shrink-0"
                style={{
                  backgroundColor: 'var(--color-bgSecondary)',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            
            <div className="flex-1 min-w-0">
              {/* Subreddit and type badge */}
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: '#FF4500',
                    color: 'white',
                  }}
                >
                  r/{redditData.subreddit}
                </span>
                {redditData.post_hint && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--color-bgSecondary)',
                      color: 'var(--color-textMuted)',
                    }}
                  >
                    {redditData.post_hint === 'image' ? '🖼️ Image' : 
                     redditData.post_hint === 'video' || redditData.is_video ? '🎥 Video' :
                     redditData.post_hint === 'link' ? '🔗 Link' : '📝 Text'}
                  </span>
                )}
              </div>
              
              {/* Title */}
              <div 
                className="font-semibold mb-2 line-clamp-2"
                style={{
                  color: 'var(--color-text)',
                  fontSize: 'var(--sizing-textBase)',
                }}
              >
                {redditData.title}
              </div>
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
                  <User className="w-3 h-3" />
                  <span>u/{redditData.author}</span>
                </div>
                
                <div className="flex items-center gap-1" style={{ color: '#FF8B60' }}>
                  <ArrowUp className="w-3 h-3" />
                  <span className="font-semibold">{redditData.score.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
                  <MessageSquare className="w-3 h-3" />
                  <span>{redditData.num_comments.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
                  <Calendar className="w-3 h-3" />
                  <span>{timeString}</span>
                </div>
              </div>
              
              {/* Text preview for self posts */}
              {redditData.selftext && redditData.selftext.length > 0 && (
                <div 
                  className="mt-2 text-xs line-clamp-2"
                  style={{
                    color: 'var(--color-textSecondary)',
                  }}
                >
                  {redditData.selftext.substring(0, 150)}
                  {redditData.selftext.length > 150 ? '...' : ''}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer with Reddit branding */}
          <div 
            className="px-3 py-2 border-t flex items-center justify-between"
            style={{
              backgroundColor: 'var(--color-bgSecondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <img 
                src="https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png" 
                alt="Reddit" 
                className="w-4 h-4"
              />
              <span 
                className="text-xs font-semibold"
                style={{ color: '#FF4500' }}
              >
                Reddit
              </span>
            </div>
            <ExternalLink className="w-3 h-3" style={{ color: 'var(--color-textMuted)' }} />
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
  }

  // Fallback: Generic URL preview for non-Reddit links
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
