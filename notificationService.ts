
import { PedestrianCrossing, CrossingState, AssetType } from '../types';

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  calculateMonthsSince(dateStr: string): number {
    const lastDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  },

  async checkMaintenanceDeadlines(crossings: PedestrianCrossing[]) {
    const hasPermission = Notification.permission === 'granted';
    if (!hasPermission) return;

    const today = new Date().toISOString().split('T')[0];
    const notifiedKey = 'crosssafe_notified_elements';
    const notifiedData = JSON.parse(localStorage.getItem(notifiedKey) || '{}');

    crossings.forEach(c => {
      // Prioritzem la data d'inspecció si és més recent que la de pintat
      const effectiveDate = c.lastInspectedDate && c.lastInspectedDate > c.lastPaintedDate 
        ? c.lastInspectedDate 
        : c.lastPaintedDate;
        
      const months = this.calculateMonthsSince(effectiveDate);
      
      // Control obligatori 6 mesos per a estat Excel·lent
      const isExcellentMaintenanceCheck = c.assetType === AssetType.CROSSING && 
                                         c.state === CrossingState.EXCELLENT && 
                                         months >= 6;
      
      // Manteniment estàndard: 11 mesos o estats degradats
      const isCritical = c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS;
      const isStandardMaintenance = months >= 11;
      
      if (isStandardMaintenance || isCritical || isExcellentMaintenanceCheck) {
        const lastNotified = notifiedData[c.id];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (!lastNotified || new Date(lastNotified) < sevenDaysAgo) {
          let typeLabel = isCritical ? 'CRÍTIC' : (isExcellentMaintenanceCheck ? 'REVISIÓ 6m' : 'MANTENIMENT');
          this.sendPushNotification(c, months, typeLabel);
          notifiedData[c.id] = today;
        }
      }
    });

    localStorage.setItem(notifiedKey, JSON.stringify(notifiedData));
  },

  sendPushNotification(crossing: PedestrianCrossing, months: number, typeLabel: string) {
    const title = `⚠️ ${typeLabel}: ${crossing.assetType}`;
    const options: NotificationOptions = {
      body: `${crossing.location.street || 'Ubicació'}\nEstat: ${crossing.state}. Fa ${months} mesos de la darrera revisió.`,
      icon: 'https://cdn-icons-png.flaticon.com/512/565/565547.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/565/565547.png',
      tag: crossing.id,
      data: { url: window.location.href }
    };

    new Notification(title, options);
  }
};
