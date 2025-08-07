import { useState, useEffect } from 'react';

export function useNotifications() {
  const [enableNotifications, setEnableNotifications] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableNotifications');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    const handleNotificationSettingsChange = (event: CustomEvent) => {
      setEnableNotifications(event.detail.enableNotifications);
    };

    window.addEventListener('notificationSettingsChanged', handleNotificationSettingsChange as EventListener);

    return () => {
      window.removeEventListener('notificationSettingsChanged', handleNotificationSettingsChange as EventListener);
    };
  }, []);

  return { enableNotifications };
}
