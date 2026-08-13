import { useData, normalizeCertificateList } from './data-store';

let lastRefreshTime = 0;
let isRefreshing = false;

export async function refreshData(force = false) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (!force && (isRefreshing || now - lastRefreshTime < 2000)) {
    return;
  }
  isRefreshing = true;
  lastRefreshTime = now;

  const endpoints = [
    { url: '/api/courses', key: 'courses' },
    { url: '/api/users', key: 'users' },
    { url: '/api/certificates', key: 'certificates' },
    { url: '/api/assessments', key: 'assessments' },
    { url: '/api/submissions', key: 'submissions' },
    { url: '/api/progress', key: 'progress' },
    { url: '/api/notifications', key: 'notifications' },
    { url: '/api/messages', key: 'messages' },
    { url: '/api/events', key: 'events' },
    { url: '/api/announcements', key: 'announcements' },
    { url: '/api/discussions', key: 'discussions' },
    { url: '/api/discussion-replies', key: 'discussionReplies' },
    { url: '/api/video-checkpoints', key: 'videoCheckpoints' },
    { url: '/api/checkpoint-progress', key: 'checkpointProgress' }
  ];

  try {
    await Promise.all(
      endpoints.map(async ({ url, key }) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            if (json[key]) {
              if (key === 'certificates') {
                useData.setState({ certificates: normalizeCertificateList(json.certificates) });
              } else {
                useData.setState({ [key]: json[key] });
              }
            }
          }
        } catch (err) {
          console.error(`Failed to load ${key} from ${url}`, err);
        }
      })
    );

    // Separately load extra attempts (map format, not array)
    try {
      const res = await fetch('/api/extra-attempts');
      if (res.ok) {
        const json = await res.json();
        if (json.extraAttempts && typeof json.extraAttempts === 'object') {
          useData.getState().loadExtraAttempts(json.extraAttempts);
        }
      }
    } catch (err) {
      console.error('Failed to load extra attempts', err);
    }
  } finally {
    isRefreshing = false;
  }
}

// Run initially on import
if (typeof window !== 'undefined') {
  refreshData();
}

