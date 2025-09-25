// Launch URL helpers for streaming services
export const getServiceLaunchUrl = (serviceName: string): string | null => {
  // Map service names to their official launch URLs
  const launchUrls: Record<string, string> = {
    'Netflix': 'https://www.netflix.com',
    'Amazon Prime Video': 'https://www.primevideo.com',
    'Disney+': 'https://www.disneyplus.com',
    'HBO Max': 'https://play.hbomax.com',
    'Apple TV+': 'https://tv.apple.com',
    'Hulu': 'https://www.hulu.com',
    'YouTube Premium': 'https://www.youtube.com',
    'Spotify': 'https://open.spotify.com',
    'Paramount+': 'https://www.paramountplus.com',
    'Peacock': 'https://www.peacocktv.com',
  };

  // Extract base service name from subscription names like "Netflix - Basic"
  const baseServiceName = Object.keys(launchUrls).find(service => 
    serviceName.toLowerCase().includes(service.toLowerCase())
  );

  return baseServiceName ? launchUrls[baseServiceName] : null;
};

export const launchService = async (subscriptionId: string, serviceName: string): Promise<boolean> => {
  try {
    // Get launch URL first
    const launchUrl = getServiceLaunchUrl(serviceName);
    if (!launchUrl) {
      return false;
    }

    // Open in new tab IMMEDIATELY (synchronously) to avoid popup blocker
    const newWindow = window.open(launchUrl, '_blank', 'noopener,noreferrer');
    
    // Check if window opened successfully
    if (!newWindow || newWindow.closed) {
      throw new Error('Popup blocked or failed to open');
    }

    // Track the launch asynchronously AFTER the tab opens successfully
    fetch(`/api/subscriptions/${subscriptionId}/launch`, {
      method: 'POST',
      credentials: 'include',
    }).catch(error => {
      console.warn('Launch tracking failed:', error);
      // Don't fail the launch if tracking fails
    });

    return true;
  } catch (error) {
    console.error('Launch error:', error);
    return false;
  }
};